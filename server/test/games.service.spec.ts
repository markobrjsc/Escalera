import { describe, expect, it, vi } from "vitest";
import { GamesService } from "../src/game/games.service.js";
import { createInitialGameState } from "../src/game/game-state.js";

describe("versionssichere Spielbefehle", () => {
  it("verarbeitet dieselbe Befehlskennung höchstens einmal und liefert bei alter Version den privaten Zustand", async () => {
    const state = createInitialGameState(["p1", "p2"], 1, () => 0, 60, 0);
    state.activePlayerId = "p1";
    let version = 1;
    const game = { id: "g1", status: "ACTIVE", state, lobby: { code: "ABC", streetsRequireSameSuit: true, players: [{ userId: "p1" }, { userId: "p2" }] } };
    const prisma = { game: {
      findFirst: vi.fn(async () => ({ ...game, version })),
      updateMany: vi.fn(async ({ where, data }: { where: { version: number }; data: { state: typeof state } }) => {
        if (where.version !== version) return { count: 0 };
        game.state = data.state; version += 1; return { count: 1 };
      })
    } };
    const service = new GamesService(prisma as never, { finish: vi.fn() } as never, { recordFinishedGame: vi.fn() } as never);
    const command = { commandId: "11111111-1111-4111-8111-111111111111", expectedVersion: 1 };

    const first = await service.draw("p1", "ABC", "draw", command);
    const duplicate = await service.draw("p1", "ABC", "draw", command);

    expect(first.version).toBe(2);
    expect(duplicate).toMatchObject({ version: 2, duplicate: true });
    expect(prisma.game.updateMany).toHaveBeenCalledTimes(1);
    expect(game.state.recentActions).toHaveLength(1);
    await expect(service.draw("p1", "ABC", "draw", { commandId: "22222222-2222-4222-8222-222222222222", expectedVersion: 1 })).rejects.toMatchObject({ status: 409 });
    expect(prisma.game.updateMany).toHaveBeenCalledTimes(1);
  });
});
