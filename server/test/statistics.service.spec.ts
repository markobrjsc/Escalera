import { describe, expect, it, vi } from "vitest";
import { StatisticsService } from "../src/profiles/statistics.service.js";
import { createInitialGameState } from "../src/game/game-state.js";

function finishedGame() {
  const state = createInitialGameState(["p1", "p2"], 1, () => 0);
  state.status = "FINISHED";
  state.placements = [{ userId: "p1", rank: 1, totalPenalty: 12 }, { userId: "p2", rank: 2, totalPenalty: 40 }];
  // p1 ends phases 1, 2 and 4 — a non-contiguous set to prove it is a bitmask.
  state.roundResults = [
    { round: 1, phase: 1, endedById: "p1", scores: [] },
    { round: 2, phase: 2, endedById: "p1", scores: [] },
    { round: 3, phase: 3, endedById: "p2", scores: [] },
    { round: 4, phase: 4, endedById: "p1", scores: [] }
  ] as never;
  state.players[0].totalPenalty = 12;
  state.players[0].coins = 4; // 4 * 30 = 120 coin penalty
  state.players[0].metrics = { phasesLaid: 7, meldsLaid: 9, jokersPlayed: 2, cardsBought: 3, movesPlayed: 60, longestStreet: 9 };
  return state;
}

describe("dauerhafte Statistiken", () => {
  it("speichert Fortschritt pro Aktion und schaltet Achievements sofort frei", async () => {
    const before = createInitialGameState(["p1", "p2"], 1, () => 0);
    const after = structuredClone(before);
    after.players[0].metrics.movesPlayed = 50;
    after.players[0].metrics.cardsBought = 5;

    const created: { userId: string; achievement: string }[] = [];
    const emptyStats = {
      gamesPlayed: 0, gamesWon: 0, podiumFinishes: 0, totalPenalty: 0,
      phasesLaid: 0, meldsLaid: 0, jokersPlayed: 0, cardsBought: 0,
      timeouts: 0, reconnects: 0, movesPlayed: 0, coinPenalty: 0,
      longestStreet: 0, phaseWinsMask: 0
    };
    const tx = {
      userStatistic: {
        findUnique: vi.fn(async () => null),
        upsert: vi.fn(),
        findUniqueOrThrow: vi.fn(async (arg: { where: { userId: string } }) => arg.where.userId === "p1"
          ? { ...emptyStats, cardsBought: 5, movesPlayed: 50 }
          : emptyStats)
      },
      achievementProgress: {
        findMany: vi.fn(async () => []),
        createMany: vi.fn(async (arg: { data: { userId: string; achievement: string }[] }) => created.push(...arg.data))
      }
    };

    await new StatisticsService({} as never).recordGameProgress(tx as never, before, after);

    expect(tx.userStatistic.upsert.mock.calls[0][0].create).toMatchObject({ userId: "p1", cardsBought: 5, movesPlayed: 50 });
    expect(created).toEqual(expect.arrayContaining([
      expect.objectContaining({ userId: "p1", achievement: "market:5" }),
      expect.objectContaining({ userId: "p1", achievement: "moves:50" })
    ]));
  });

  it("rollt neue Metriken korrekt auf (Münz-Strafe, Züge, Straßenlänge, Phasen-Bitmaske)", async () => {
    const tx = {
      gameStatisticsRollup: { create: vi.fn() },
      userStatistic: { findUnique: vi.fn(async () => null), upsert: vi.fn(), findUniqueOrThrow: vi.fn(async () => ({ gamesWon: 0, cardsBought: 0, totalPenalty: 0, coinPenalty: 0, movesPlayed: 0, longestStreet: 0, phaseWinsMask: 0 })) },
      achievementProgress: { findMany: vi.fn(async () => []), createMany: vi.fn() }
    };
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<void>) => work(tx)) };

    await expect(new StatisticsService(prisma as never).recordFinishedGame("g1", finishedGame())).resolves.toBe(true);
    const p1 = tx.userStatistic.upsert.mock.calls[0][0];
    expect(p1.create).toMatchObject({ gamesPlayed: 1, gamesWon: 1, movesPlayed: 60, coinPenalty: 120, longestStreet: 9 });
    expect(p1.create.phaseWinsMask).toBe(0b0001011); // phases 1, 2, 4
  });

  it("schaltet nur neu erreichte Baum-Knoten frei", async () => {
    const created: string[] = [];
    const tx = {
      gameStatisticsRollup: { create: vi.fn() },
      userStatistic: { findUnique: vi.fn(async () => null), upsert: vi.fn(), findUniqueOrThrow: vi.fn(async () => ({ gamesWon: 1, cardsBought: 5, totalPenalty: 60, coinPenalty: 120, movesPlayed: 60, longestStreet: 9, phaseWinsMask: 0b0001011 })) },
      achievementProgress: { findMany: vi.fn(async () => [{ achievement: "wins:1" }]), createMany: vi.fn(async (arg: { data: { achievement: string }[] }) => created.push(...arg.data.map((row) => row.achievement))) }
    };
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<void>) => work(tx)) };

    await new StatisticsService(prisma as never).recordFinishedGame("g1", finishedGame());
    expect(created).toContain("phases:4");
    expect(created).toContain("streets:9");
    expect(created).toContain("penalty:50");
    expect(created).toContain("coins:60");
    expect(created).toContain("moves:50");
    expect(created).not.toContain("wins:1"); // already unlocked, not re-fired
    expect(created).not.toContain("phases:3"); // p1 never ended phase 3
    expect(created).not.toContain("streets:10"); // longestStreet is only 9
  });

  it("gewährt einen Phasengewinn sofort und nur einmal", async () => {
    const created: { achievement: string }[] = [];
    const tx = {
      userStatistic: { findUnique: vi.fn(async () => ({ phaseWinsMask: 0b0000001 })), upsert: vi.fn() },
      achievementProgress: { findUnique: vi.fn(async () => null), create: vi.fn(async (arg: { data: { achievement: string } }) => created.push(arg.data)) }
    };
    const prisma = { $transaction: vi.fn(async (work: (client: typeof tx) => Promise<void>) => work(tx)) };
    await new StatisticsService(prisma as never).recordPhaseWin("p1", 3);
    expect(tx.userStatistic.upsert.mock.calls[0][0].update.phaseWinsMask).toBe(0b0000101); // phase 1 kept, phase 3 added
    expect(created).toEqual([{ userId: "p1", achievement: "phases:3", progress: 1, unlockedAt: expect.any(Date) }]);
  });

  it("baut den Baum ausschließlich aus Serverwerten", async () => {
    const prisma = {
      userStatistic: { findUnique: vi.fn(async () => ({ gamesWon: 3, cardsBought: 25, totalPenalty: 550, movesPlayed: 120, coinPenalty: 300, longestStreet: 5, phaseWinsMask: 0b0000101 })) },
      achievementProgress: { findMany: vi.fn(async () => [{ achievement: "wins:1", unlockedAt: new Date("2026-07-16T00:00:00Z") }]) }
    };
    const { tree } = await new StatisticsService(prisma as never).profile("p1");
    const wins = tree.find((branch) => branch.key === "wins")!;
    expect(wins.nodes.filter((node) => node.unlocked).map((node) => node.threshold)).toEqual([1, 3]);
    expect(wins.nodes.find((node) => node.threshold === 1)!.unlockedAt).toBe("2026-07-16T00:00:00.000Z");
    const phases = tree.find((branch) => branch.key === "phases")!;
    expect(phases.nodes.filter((node) => node.unlocked).map((node) => node.threshold)).toEqual([1, 3]);
    const streets = tree.find((branch) => branch.key === "streets")!;
    expect(streets.nodes.filter((node) => node.unlocked).map((node) => node.threshold)).toEqual([3, 4, 5]);
  });
});
