import { describe, expect, it, vi } from "vitest";
import { GamesService } from "../src/game/games.service.js";
import { createInitialGameState, type GameState } from "../src/game/game-state.js";

function harness(state: GameState) {
  let version = 1;
  const game = { id: "g1", status: "ACTIVE", state, lobby: { code: "ABC", streetsRequireSameSuit: true, players: [{ userId: "p1" }, { userId: "p2" }] } };
  const prisma = { game: {
    findFirst: vi.fn(async () => ({ ...game, version })),
    findMany: vi.fn(async () => [{ ...game, version }]),
    updateMany: vi.fn(async ({ where, data }: { where: { version: number }; data: { state: GameState } }) => {
      if (where.version !== version) return { count: 0 };
      game.state = data.state;
      version += 1;
      return { count: 1 };
    })
  }, $transaction: async <T>(operation: (tx: { game: typeof prisma.game }) => Promise<T>) => operation({ game: prisma.game }) };
  const service = new GamesService(
    prisma as never,
    { finish: vi.fn() } as never,
    { recordFinishedGame: vi.fn(), recordPhaseWin: vi.fn(), recordGameProgress: vi.fn() } as never
  );
  return { service, prisma, game };
}

describe("versionssichere Spielbefehle", () => {
  it("verarbeitet dieselbe Befehlskennung höchstens einmal und veröffentlicht die Zugquelle", async () => {
    const state = createInitialGameState(["p1", "p2"], 1, () => 0, 60, 0);
    state.activePlayerId = "p1";
    const { service, prisma, game } = harness(state);
    const command = { commandId: "11111111-1111-4111-8111-111111111111", expectedVersion: 1 };

    const first = await service.draw("p1", "ABC", "discard", command);
    const duplicate = await service.draw("p1", "ABC", "discard", command);

    expect(first.version).toBe(2);
    expect(first.state.turn.opensAt).toBeNull();
    expect(duplicate).toMatchObject({ version: 2, duplicate: true });
    expect(prisma.game.updateMany).toHaveBeenCalledTimes(1);
    expect(game.state.recentActions).toEqual([expect.objectContaining({
      commandId: command.commandId,
      type: "draw",
      metadata: { source: "discard" }
    })]);
    await expect(service.draw("p1", "ABC", "draw", { commandId: "22222222-2222-4222-8222-222222222222", expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
    expect(prisma.game.updateMany).toHaveBeenCalledTimes(1);
  });

  it("weist Spieler- und Disconnect-Mutationen vor der gemeinsamen Startbarriere zurück", async () => {
    const now = Date.now();
    const state = createInitialGameState(["p1", "p2"], 1, () => 0, 60, now);
    state.activePlayerId = "p1";
    const { service, prisma } = harness(state);

    await expect(service.draw("p1", "ABC", "draw", { commandId: "early-draw", expectedVersion: 1 })).rejects.toMatchObject({ status: 400 });
    await expect(service.skipDisconnected("ABC", "p1", now)).resolves.toBe(false);
    expect(prisma.game.updateMany).not.toHaveBeenCalled();
  });

  it("kennzeichnet beim Timeout den enthaltenen Draw und Discard ohne Kartenidentität", async () => {
    const state = createInitialGameState(["p1", "p2"], 1, () => 0, 60, 0);
    state.activePlayerId = "p1";
    const now = Date.parse(state.turn.deadlineAt!);
    const { service, game } = harness(state);

    await expect(service.expireDueTurns(now)).resolves.toEqual(["ABC"]);

    const action = game.state.recentActions.at(-1);
    expect(action).toMatchObject({
      type: "timeout",
      metadata: { source: "draw", includesDraw: true, includesDiscard: true }
    });
    expect(JSON.stringify(action)).not.toContain("cardId");
  });

  it("kennzeichnet beim Disconnect nach einem bereits erfolgten Draw nur den Discard", async () => {
    const state = createInitialGameState(["p1", "p2"], 1, () => 0, 60, 0);
    state.activePlayerId = "p1";
    state.turn.hasDrawn = true;
    const now = Date.parse(state.turn.opensAt!) + 1;
    const { service, game } = harness(state);

    await expect(service.skipDisconnected("ABC", "p1", now)).resolves.toBe(true);

    expect(game.state.recentActions.at(-1)).toMatchObject({
      type: "disconnect-skip",
      metadata: { includesDraw: false, includesDiscard: true }
    });
    expect(game.state.recentActions.at(-1)?.metadata).not.toHaveProperty("source");
  });
});
