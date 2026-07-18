import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import type { GameState } from "../game/game-state.js";

// Every coin a player still holds at the end converts to penalty points; the
// coin-penalty branch tracks the accumulated total across all games.
const COIN_PENALTY = 30;

type StatBag = {
  gamesPlayed: number; gamesWon: number; podiumFinishes: number; totalPenalty: number;
  phasesLaid: number; meldsLaid: number; jokersPlayed: number; cardsBought: number;
  timeouts: number; reconnects: number; movesPlayed: number; coinPenalty: number;
  longestStreet: number; phaseWinsMask: number;
};

type Branch = {
  key: string;
  title: string;
  // "phase" nodes are independent bits in phaseWinsMask; "gte" nodes unlock once
  // the backing stat reaches the threshold and stay unlocked.
  kind: "phase" | "gte";
  stat?: keyof StatBag;
  nodes: number[];
  label: (value: number) => string;
};

// The achievement tree: an empty root with these seven branches radiating out.
export const ACHIEVEMENT_TREE: Branch[] = [
  { key: "phases", title: "Phasen", kind: "phase", nodes: [1, 2, 3, 4, 5, 6, 7], label: (n) => `Phase ${n}` },
  { key: "streets", title: "Straßen", kind: "gte", stat: "longestStreet", nodes: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], label: (n) => `Straße ${n}` },
  { key: "wins", title: "Siege", kind: "gte", stat: "gamesWon", nodes: [1, 3, 5, 10, 25, 50, 100], label: (n) => `${n} ${n === 1 ? "Sieg" : "Siege"}` },
  { key: "market", title: "Marktgänger", kind: "gte", stat: "cardsBought", nodes: [5, 25, 100], label: (n) => `${n} Käufe` },
  { key: "penalty", title: "Strafpunkte", kind: "gte", stat: "totalPenalty", nodes: [50, 100, 500, 1000, 1500, 2000, 5000, 10000], label: (n) => `${n} Strafpunkte` },
  { key: "coins", title: "Münz-Strafe", kind: "gte", stat: "coinPenalty", nodes: [60, 300, 600, 1200, 2400, 4800], label: (n) => `${n} aus Münzen` },
  { key: "moves", title: "Züge", kind: "gte", stat: "movesPlayed", nodes: [50, 100, 200, 500, 1000], label: (n) => `${n} Züge` }
];

function nodeId(branch: Branch, node: number) { return `${branch.key}:${node}`; }
function nodeUnlocked(branch: Branch, node: number, stats: StatBag): boolean {
  return branch.kind === "phase" ? (stats.phaseWinsMask & (1 << (node - 1))) !== 0 : Number(stats[branch.stat!]) >= node;
}
function unlockedIds(stats: StatBag): string[] {
  return ACHIEVEMENT_TREE.flatMap((branch) => branch.nodes.filter((node) => nodeUnlocked(branch, node, stats)).map((node) => nodeId(branch, node)));
}

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  // The OPEN -> ACTIVE compare-and-set in LobbiesService is the idempotency
  // boundary. Keeping this increment in the same transaction means a game and
  // all participant counters either start together or not at all.
  async recordGameStarted(tx: Prisma.TransactionClient, playerIds: string[]) {
    for (const userId of playerIds) {
      await tx.userStatistic.upsert({
        where: { userId },
        create: { userId, gamesPlayed: 1 },
        update: { gamesPlayed: { increment: 1 } }
      });
    }
  }

  // Persist one accepted state transition inside the same transaction as the
  // game version. Deltas make retries idempotent and profiles update live.
  async recordGameProgress(tx: Prisma.TransactionClient, before: GameState, after: GameState) {
    for (const player of after.players) {
      const previous = before.players.find((entry) => entry.userId === player.userId);
      if (!previous) continue;
      const existing = await tx.userStatistic.findUnique({ where: { userId: player.userId } });
      const phaseWinsMask = after.roundResults.slice(before.roundResults.length)
        .filter((round) => round.endedById === player.userId)
        .reduce((mask, round) => mask | (1 << (round.phase - 1)), existing?.phaseWinsMask ?? 0);
      const finished = before.status !== "FINISHED" && after.status === "FINISHED";
      const placement = after.placements.find((entry) => entry.userId === player.userId)?.rank ?? 99;
      const values = {
        gamesWon: finished && placement === 1 ? 1 : 0,
        podiumFinishes: finished && placement <= 3 ? 1 : 0,
        totalPenalty: player.totalPenalty - previous.totalPenalty,
        phasesLaid: player.metrics.phasesLaid - previous.metrics.phasesLaid,
        meldsLaid: player.metrics.meldsLaid - previous.metrics.meldsLaid,
        jokersPlayed: player.metrics.jokersPlayed - previous.metrics.jokersPlayed,
        cardsBought: player.metrics.cardsBought - previous.metrics.cardsBought,
        timeouts: player.timeouts - previous.timeouts,
        reconnects: player.disconnectSkips - previous.disconnectSkips,
        movesPlayed: player.metrics.movesPlayed - previous.metrics.movesPlayed,
        coinPenalty: finished ? player.coins * COIN_PENALTY : 0
      };
      const longestStreet = Math.max(existing?.longestStreet ?? 0, player.metrics.longestStreet);
      await tx.userStatistic.upsert({
        where: { userId: player.userId },
        create: { userId: player.userId, ...values, longestStreet, phaseWinsMask },
        update: { gamesWon: { increment: values.gamesWon }, podiumFinishes: { increment: values.podiumFinishes }, totalPenalty: { increment: values.totalPenalty }, phasesLaid: { increment: values.phasesLaid }, meldsLaid: { increment: values.meldsLaid }, jokersPlayed: { increment: values.jokersPlayed }, cardsBought: { increment: values.cardsBought }, timeouts: { increment: values.timeouts }, reconnects: { increment: values.reconnects }, movesPlayed: { increment: values.movesPlayed }, coinPenalty: { increment: values.coinPenalty }, longestStreet, phaseWinsMask }
      });
      const stored = await tx.userStatistic.findUniqueOrThrow({ where: { userId: player.userId } });
      const already = new Set((await tx.achievementProgress.findMany({ where: { userId: player.userId }, select: { achievement: true } })).map((row) => row.achievement));
      const fresh = unlockedIds(stored as StatBag).filter((id) => !already.has(id));
      if (fresh.length) await tx.achievementProgress.createMany({ data: fresh.map((achievement) => ({ userId: player.userId, achievement, progress: 1, unlockedAt: new Date() })) });
    }
  }

  async recordFinishedGame(gameId: string, state: GameState) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.gameStatisticsRollup.create({ data: { gameId } });
        for (const player of state.players) {
          const placement = state.placements.find((entry) => entry.userId === player.userId)?.rank ?? state.players.length;
          const wonPhases = state.roundResults.filter((round) => round.endedById === player.userId).reduce((mask, round) => mask | (1 << (round.phase - 1)), 0);
          const before = await tx.userStatistic.findUnique({ where: { userId: player.userId } });
          // longestStreet is a max and phaseWinsMask a bitwise OR, so both need a
          // read-modify-write rather than Prisma's increment.
          const merged = {
            longestStreet: Math.max(before?.longestStreet ?? 0, player.metrics.longestStreet),
            phaseWinsMask: (before?.phaseWinsMask ?? 0) | wonPhases
          };
          await tx.userStatistic.upsert({
            where: { userId: player.userId },
            create: { userId: player.userId, gamesWon: placement === 1 ? 1 : 0, podiumFinishes: placement <= 3 ? 1 : 0, totalPenalty: player.totalPenalty, phasesLaid: player.metrics.phasesLaid, meldsLaid: player.metrics.meldsLaid, jokersPlayed: player.metrics.jokersPlayed, cardsBought: player.metrics.cardsBought, timeouts: player.timeouts, reconnects: player.disconnectSkips, movesPlayed: player.metrics.movesPlayed, coinPenalty: player.coins * COIN_PENALTY, ...merged },
            update: { gamesWon: { increment: placement === 1 ? 1 : 0 }, podiumFinishes: { increment: placement <= 3 ? 1 : 0 }, totalPenalty: { increment: player.totalPenalty }, phasesLaid: { increment: player.metrics.phasesLaid }, meldsLaid: { increment: player.metrics.meldsLaid }, jokersPlayed: { increment: player.metrics.jokersPlayed }, cardsBought: { increment: player.metrics.cardsBought }, timeouts: { increment: player.timeouts }, reconnects: { increment: player.disconnectSkips }, movesPlayed: { increment: player.metrics.movesPlayed }, coinPenalty: { increment: player.coins * COIN_PENALTY }, ...merged }
          });

          const after = await tx.userStatistic.findUniqueOrThrow({ where: { userId: player.userId } });
          const already = new Set((await tx.achievementProgress.findMany({ where: { userId: player.userId }, select: { achievement: true } })).map((row) => row.achievement));
          const fresh = unlockedIds(after as StatBag).filter((id) => !already.has(id));
          if (fresh.length) await tx.achievementProgress.createMany({ data: fresh.map((achievement) => ({ userId: player.userId, achievement, progress: 1, unlockedAt: new Date() })) });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
    return true;
  }

  // Grants the phase-win node the moment a player goes out, rather than waiting
  // for the whole game to finish. recordFinishedGame later ORs the same bit, so
  // this stays consistent and never double-grants (existing rows are skipped).
  async recordPhaseWin(userId: string, phase: number) {
    const bit = 1 << (phase - 1);
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.userStatistic.findUnique({ where: { userId } });
      const mask = (before?.phaseWinsMask ?? 0) | bit;
      await tx.userStatistic.upsert({ where: { userId }, create: { userId, phaseWinsMask: mask }, update: { phaseWinsMask: mask } });
      const id = `phases:${phase}`;
      const exists = await tx.achievementProgress.findUnique({ where: { userId_achievement: { userId, achievement: id } } });
      if (!exists) await tx.achievementProgress.create({ data: { userId, achievement: id, progress: 1, unlockedAt: new Date() } });
    });
  }

  async profile(userId: string) {
    const [stored, progress] = await Promise.all([
      this.prisma.userStatistic.findUnique({ where: { userId } }),
      this.prisma.achievementProgress.findMany({ where: { userId } })
    ]);
    const statistics: StatBag = {
      gamesPlayed: stored?.gamesPlayed ?? 0, gamesWon: stored?.gamesWon ?? 0, podiumFinishes: stored?.podiumFinishes ?? 0,
      totalPenalty: stored?.totalPenalty ?? 0, phasesLaid: stored?.phasesLaid ?? 0, meldsLaid: stored?.meldsLaid ?? 0,
      jokersPlayed: stored?.jokersPlayed ?? 0, cardsBought: stored?.cardsBought ?? 0, timeouts: stored?.timeouts ?? 0,
      reconnects: stored?.reconnects ?? 0, movesPlayed: stored?.movesPlayed ?? 0, coinPenalty: stored?.coinPenalty ?? 0,
      longestStreet: stored?.longestStreet ?? 0, phaseWinsMask: stored?.phaseWinsMask ?? 0
    };
    const unlockedAt = new Map(progress.map((row) => [row.achievement, row.unlockedAt?.toISOString() ?? null]));
    const tree = ACHIEVEMENT_TREE.map((branch) => ({
      key: branch.key,
      title: branch.title,
      kind: branch.kind,
      // Current progress for the branch's backing stat; drives the hover tooltip.
      value: branch.kind === "gte" ? Number(statistics[branch.stat!]) : 0,
      nodes: branch.nodes.map((node) => {
        const id = nodeId(branch, node);
        return { id, label: branch.label(node), threshold: node, unlocked: nodeUnlocked(branch, node, statistics), unlockedAt: unlockedAt.get(id) ?? null };
      })
    }));
    return { statistics, tree };
  }
}
