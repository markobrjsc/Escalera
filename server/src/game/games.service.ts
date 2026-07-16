import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import { addCardToMeld, buyDiscard, discardCard, drawCard, expireTurn, GameActionError, layAdditionalMeld, layPhase, skipDisconnectedTurn } from "./game-engine.js";
import { normalizeGameState, toPlayerGameView, type GameState } from "./game-state.js";
import { LobbyLifecycleService } from "../lobbies/lobby-lifecycle.service.js";
import type { GameActionType } from "@escalera/contracts";
import { StatisticsService } from "../profiles/statistics.service.js";

type LoadedGame = Prisma.GameGetPayload<{ include: { lobby: { include: { players: true } } } }>;
type CommandMetadata = { commandId: string; expectedVersion: number };

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService, private readonly lifecycle: LobbyLifecycleService, private readonly statistics: StatisticsService) {}

  draw(userId: string, code: string, source: "draw" | "discard", command: CommandMetadata) {
    return this.mutate(userId, code, "draw", command, (state) => drawCard(state, userId, source));
  }

  phase(userId: string, code: string, combinations: string[][], command: CommandMetadata) {
    return this.mutate(userId, code, "phase", command, (state) => layPhase(state, userId, combinations));
  }

  meld(userId: string, code: string, cardIds: string[], command: CommandMetadata) {
    return this.mutate(userId, code, "meld", command, (state, game) => layAdditionalMeld(state, userId, cardIds, game.lobby.streetsRequireSameSuit));
  }

  addToMeld(userId: string, code: string, meldId: string, cardId: string, command: CommandMetadata) {
    return this.mutate(userId, code, "add-to-meld", command, (state) => addCardToMeld(state, userId, meldId, cardId));
  }

  discard(userId: string, code: string, cardId: string, command: CommandMetadata) {
    return this.mutate(userId, code, "discard", command, (state) => discardCard(state, userId, cardId));
  }

  buy(userId: string, code: string, command: CommandMetadata) {
    return this.mutate(userId, code, "buy", command, (state) => buyDiscard(state, userId));
  }

  async expireDueTurns(now = Date.now()) {
    const games = await this.prisma.game.findMany({ where: { status: "ACTIVE" }, include: { lobby: { include: { players: true } } } });
    const changedCodes: string[] = [];
    for (const game of games) {
      const current = normalizeGameState(game.state as unknown as GameState);
      if (!current.turn.deadlineAt || Date.parse(current.turn.deadlineAt) > now) continue;
      let state: GameState;
      try { state = expireTurn(structuredClone(current), now); } catch (error) {
        if (error instanceof GameActionError) continue;
        throw error;
      }
      this.recordAction(state, `server-timeout-${game.id}-${game.version}`, current.activePlayerId, "timeout", game.version + 1);
      const updated = await this.prisma.game.updateMany({
        where: { id: game.id, version: game.version, status: "ACTIVE" },
        data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } }
      });
      if (updated.count === 1) changedCodes.push(game.lobby.code);
    }
    return changedCodes;
  }

  async skipDisconnected(code: string, userId: string, now = Date.now()) {
    const game = await this.load(code);
    const current = normalizeGameState(game.state as unknown as GameState);
    if (current.status === "FINISHED" || current.activePlayerId !== userId) return false;
    const state = skipDisconnectedTurn(structuredClone(current), userId, now);
    this.recordAction(state, `server-disconnect-${game.id}-${game.version}`, userId, "disconnect-skip", game.version + 1);
    const updated = await this.prisma.game.updateMany({
      where: { id: game.id, version: game.version, status: "ACTIVE" },
      data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } }
    });
    return updated.count === 1;
  }

  private async mutate(userId: string, code: string, type: GameActionType, command: CommandMetadata, action: (state: GameState, game: LoadedGame) => GameState) {
    const game = await this.load(code);
    if (!game.lobby.players.some((entry) => entry.userId === userId)) throw new ForbiddenException("Du bist nicht Mitglied dieser Partie.");
    const current = normalizeGameState(game.state as unknown as GameState);
    const processed = current.processedCommands.find((entry) => entry.commandId === command.commandId);
    if (processed) {
      if (processed.userId !== userId) throw new BadRequestException("Diese Befehlskennung wurde bereits verwendet.");
      return { version: game.version, state: toPlayerGameView(current, userId), duplicate: true };
    }
    if (command.expectedVersion !== game.version) {
      throw new ConflictException({ message: "Dein Spielzustand ist veraltet.", version: game.version, state: toPlayerGameView(current, userId) });
    }
    let state: GameState;
    try {
      state = action(structuredClone(current), game);
    } catch (error) {
      if (error instanceof GameActionError) throw new BadRequestException(error.message);
      throw error;
    }
    this.recordAction(state, command.commandId, userId, type, game.version + 1);
    const updated = await this.prisma.game.updateMany({
      where: { id: game.id, version: game.version, status: "ACTIVE" },
      data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } }
    });
    if (updated.count !== 1) throw new ConflictException("Der Spielzustand wurde bereits verändert. Bitte erneut versuchen.");
    if (state.status === "FINISHED") {
      await this.statistics.recordFinishedGame(game.id, state);
      await this.lifecycle.finish(game.lobby.code);
    } else if (state.roundResults.length > current.roundResults.length) {
      // A round just ended without finishing the game: grant the winner their
      // phase-win achievement immediately instead of waiting for phase 7.
      const won = state.roundResults[state.roundResults.length - 1];
      await this.statistics.recordPhaseWin(won.endedById, won.phase);
    }
    return { version: game.version + 1, state: toPlayerGameView(state, userId) };
  }

  private recordAction(state: GameState, commandId: string, userId: string, type: GameActionType, version: number) {
    state.processedCommands = [...state.processedCommands, { commandId, userId, version }].slice(-100);
    state.recentActions = [...state.recentActions, { commandId, userId, type, version, createdAt: new Date().toISOString() }].slice(-20);
  }

  private async load(code: string) {
    const game = await this.prisma.game.findFirst({
      where: { lobby: { code: code.toUpperCase() } },
      include: { lobby: { include: { players: true } } }
    });
    if (!game) throw new NotFoundException("Partie nicht gefunden.");
    return game;
  }
}
