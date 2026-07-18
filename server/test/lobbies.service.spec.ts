import { describe, expect, it, vi } from "vitest";
import { LobbiesService } from "../src/lobbies/lobbies.service.js";

describe("Spielstart-Statistik", () => {
  it("nutzt den OPEN-ACTIVE-Wechsel als Idempotenzgrenze", async () => {
    const transaction = {
      lobby: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 }) },
      game: { create: vi.fn() },
      userStatistic: { upsert: vi.fn() }
    };
    const prisma = { $transaction: vi.fn(async (work: (tx: typeof transaction) => Promise<void>) => work(transaction)) };
    const statistics = { recordGameStarted: vi.fn() };
    const service = new LobbiesService(prisma as never, {} as never, {} as never, statistics as never);
    const lobby = {
      id: "lobby-1",
      code: "ABC123",
      jokersPerPlayer: 1,
      maxTurnSeconds: null,
      players: [{ userId: "p1" }, { userId: "p2" }]
    };
    const createGame = (service as unknown as { createGame(value: typeof lobby): Promise<void> }).createGame.bind(service);

    await createGame(lobby);
    await createGame(lobby);

    expect(transaction.game.create).toHaveBeenCalledTimes(1);
    expect(statistics.recordGameStarted).toHaveBeenCalledTimes(1);
    expect(statistics.recordGameStarted).toHaveBeenCalledWith(transaction, ["p1", "p2"]);
  });
});
