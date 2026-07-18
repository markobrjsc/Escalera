import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import { addCardToMeld, buyDiscard, discardCard, drawCard, expireTurn, GameActionError, layAdditionalMeld, layPhase, skipDisconnectedTurn } from "./game-engine.js";
import { normalizeGameState, toPlayerGameView, turnHasOpened, type GameState } from "./game-state.js";
import { LobbyLifecycleService } from "../lobbies/lobby-lifecycle.service.js";
import type { GameActionType, RecentGameActionMetadata } from "@escalera/contracts";
import { StatisticsService } from "../profiles/statistics.service.js";

type LoadedGame = Prisma.GameGetPayload<{ include: { lobby: { include: { players: true } } } }>;
type CommandMetadata = { commandId: string; expectedVersion: number };

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService, private readonly lifecycle: LobbyLifecycleService, private readonly statistics: StatisticsService) {}

  draw(userId: string, code: string, source: "draw" | "discard", command: CommandMetadata) {
    return this.mutate(userId, code, "draw", command, (state) => drawCard(state, userId, source), { source });
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
      if (!turnHasOpened(current.turn, now)) continue;
      if (!current.turn.deadlineAt || Date.parse(current.turn.deadlineAt) > now) continue;
      const includesDraw = !current.turn.hasDrawn;
      let state: GameState;
      try { state = expireTurn(structuredClone(current), now); } catch (error) {
        if (error instanceof GameActionError) continue;
        throw error;
      }
      this.recordAction(state, `server-timeout-${game.id}-${game.version}`, current.activePlayerId, "timeout", game.version + 1, {
        ...(includesDraw ? { source: "draw" as const } : {}),
        includesDraw,
        includesDiscard: true
      });
      const updated = await this.prisma.$transaction(async (tx) => {
        const result = await tx.game.updateMany({ where: { id: game.id, version: game.version, status: "ACTIVE" }, data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } } });
        if (result.count) await this.statistics.recordGameProgress(tx, current, state);
        return result;
      });
      if (updated.count === 1) changedCodes.push(game.lobby.code);
    }
    return changedCodes;
  }

  async skipDisconnected(code: string, userId: string, now = Date.now()) {
    const game = await this.load(code);
    const current = normalizeGameState(game.state as unknown as GameState);
    if (current.status === "FINISHED" || current.activePlayerId !== userId) return false;
    if (!turnHasOpened(current.turn, now)) return false;
    const includesDraw = !current.turn.hasDrawn;
    const state = skipDisconnectedTurn(structuredClone(current), userId, now);
    this.recordAction(state, `server-disconnect-${game.id}-${game.version}`, userId, "disconnect-skip", game.version + 1, {
      ...(includesDraw ? { source: "draw" as const } : {}),
      includesDraw,
      includesDiscard: true
    });
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.game.updateMany({ where: { id: game.id, version: game.version, status: "ACTIVE" }, data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } } });
      if (result.count) await this.statistics.recordGameProgress(tx, current, state);
      return result;
    });
    return updated.count === 1;
  }

  private async mutate(userId: string, code: string, type: GameActionType, command: CommandMetadata, action: (state: GameState, game: LoadedGame) => GameState, metadata?: RecentGameActionMetadata) {
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
    if (!turnHasOpened(current.turn)) throw new BadRequestException("Die Karten werden noch ausgeteilt.");
    let state: GameState;
    try {
      const actionable = structuredClone(current);
      actionable.turn.opensAt = null;
      state = action(actionable, game);
    } catch (error) {
      if (error instanceof GameActionError) throw new BadRequestException(error.message);
      throw error;
    }
    this.recordAction(state, command.commandId, userId, type, game.version + 1, metadata);
    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.game.updateMany({ where: { id: game.id, version: game.version, status: "ACTIVE" }, data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } } });
      if (result.count) await this.statistics.recordGameProgress(tx, current, state);
      return result;
    });
    if (updated.count !== 1) throw new ConflictException("Der Spielzustand wurde bereits verändert. Bitte erneut versuchen.");
    if (state.status === "FINISHED") {
      await this.lifecycle.finish(game.lobby.code);
    }
    return { version: game.version + 1, state: toPlayerGameView(state, userId) };
  }

  private recordAction(state: GameState, commandId: string, userId: string, type: GameActionType, version: number, metadata?: RecentGameActionMetadata) {
    state.processedCommands = [...state.processedCommands, { commandId, userId, version }].slice(-100);
    state.recentActions = [...state.recentActions, { commandId, userId, type, version, createdAt: new Date().toISOString(), ...(metadata ? { metadata } : {}) }].slice(-20);
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
