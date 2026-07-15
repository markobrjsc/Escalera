import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import { addCardToMeld, buyDiscard, discardCard, drawCard, expireTurn, GameActionError, layAdditionalMeld, layPhase, skipDisconnectedTurn } from "./game-engine.js";
import { normalizeGameState, toPlayerGameView, type GameState } from "./game-state.js";

type LoadedGame = Prisma.GameGetPayload<{ include: { lobby: { include: { players: true } } } }>;

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  draw(userId: string, code: string, source: "draw" | "discard") {
    return this.mutate(userId, code, (state) => drawCard(state, userId, source));
  }

  phase(userId: string, code: string, combinations: string[][]) {
    return this.mutate(userId, code, (state) => layPhase(state, userId, combinations));
  }

  meld(userId: string, code: string, cardIds: string[]) {
    return this.mutate(userId, code, (state, game) => layAdditionalMeld(state, userId, cardIds, game.lobby.streetsRequireSameSuit));
  }

  addToMeld(userId: string, code: string, meldId: string, cardId: string) {
    return this.mutate(userId, code, (state) => addCardToMeld(state, userId, meldId, cardId));
  }

  discard(userId: string, code: string, cardId: string) {
    return this.mutate(userId, code, (state) => discardCard(state, userId, cardId));
  }

  buy(userId: string, code: string) {
    return this.mutate(userId, code, (state) => buyDiscard(state, userId));
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
    const updated = await this.prisma.game.updateMany({
      where: { id: game.id, version: game.version, status: "ACTIVE" },
      data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } }
    });
    return updated.count === 1;
  }

  private async mutate(userId: string, code: string, action: (state: GameState, game: LoadedGame) => GameState) {
    const game = await this.load(code);
    if (!game.lobby.players.some((entry) => entry.userId === userId)) throw new ForbiddenException("Du bist nicht Mitglied dieser Partie.");
    let state: GameState;
    try {
      state = action(structuredClone(normalizeGameState(game.state as unknown as GameState)), game);
    } catch (error) {
      if (error instanceof GameActionError) throw new BadRequestException(error.message);
      throw error;
    }
    const updated = await this.prisma.game.updateMany({
      where: { id: game.id, version: game.version, status: "ACTIVE" },
      data: { state: state as unknown as Prisma.InputJsonValue, status: state.status, phase: state.phase, version: { increment: 1 } }
    });
    if (updated.count !== 1) throw new ConflictException("Der Spielzustand wurde bereits verändert. Bitte erneut versuchen.");
    return { version: game.version + 1, state: toPlayerGameView(state, userId) };
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
