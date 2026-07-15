import { describe, expect, it, vi } from "vitest";
import { StatisticsService } from "../src/profiles/statistics.service.js";
import { createInitialGameState } from "../src/game/game-state.js";

describe("dauerhafte Statistiken", () => {
  it("aggregiert eine beendete Partie atomar und höchstens einmal", async () => {
    const state = createInitialGameState(["p1", "p2"], 1, () => 0);
    state.status = "FINISHED";
    state.placements = [{ userId: "p1", rank: 1, totalPenalty: 12 }, { userId: "p2", rank: 2, totalPenalty: 40 }];
    state.players[0].totalPenalty = 12;
    state.players[0].metrics = { phasesLaid: 7, meldsLaid: 9, jokersPlayed: 2, cardsBought: 3 };
    const tx = { gameStatisticsRollup: { create: vi.fn() }, userStatistic: { upsert: vi.fn() } };
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<void>) => work(tx)) };
    const service = new StatisticsService(prisma as never);

    await expect(service.recordFinishedGame("g1", state)).resolves.toBe(true);
    expect(tx.gameStatisticsRollup.create).toHaveBeenCalledWith({ data: { gameId: "g1" } });
    expect(tx.userStatistic.upsert).toHaveBeenCalledTimes(2);
    expect(tx.userStatistic.upsert.mock.calls[0][0].create).toMatchObject({ gamesPlayed: 1, gamesWon: 1, phasesLaid: 7, cardsBought: 3 });
  });

  it("berechnet Erfolgsstufen ausschließlich aus Serverwerten", async () => {
    const prisma = { userStatistic: { findUnique: vi.fn(async () => ({ gamesPlayed: 10, gamesWon: 5, podiumFinishes: 7, totalPenalty: 80, phasesLaid: 35, meldsLaid: 50, jokersPlayed: 8, cardsBought: 25, timeouts: 1, reconnects: 2 })) } };
    const profile = await new StatisticsService(prisma as never).profile("p1");
    expect(profile.achievements.map((entry) => entry.tier)).toEqual([2, 2, 2, 2]);
  });
});
