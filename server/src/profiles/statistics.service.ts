import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service.js";
import type { GameState } from "../game/game-state.js";

export const ACHIEVEMENTS = [
  { key: "games", title: "Stammspieler", field: "gamesPlayed", tiers: [1, 10, 50] },
  { key: "wins", title: "Siegerstraße", field: "gamesWon", tiers: [1, 5, 20] },
  { key: "phases", title: "Phasenprofi", field: "phasesLaid", tiers: [7, 35, 140] },
  { key: "buyer", title: "Marktgänger", field: "cardsBought", tiers: [5, 25, 100] }
] as const;

@Injectable()
export class StatisticsService {
  constructor(private readonly prisma: PrismaService) {}

  async recordFinishedGame(gameId: string, state: GameState) {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.gameStatisticsRollup.create({ data: { gameId } });
        for (const player of state.players) {
          const placement = state.placements.find((entry) => entry.userId === player.userId)?.rank ?? state.players.length;
          await tx.userStatistic.upsert({
            where: { userId: player.userId },
            create: { userId: player.userId, gamesPlayed: 1, gamesWon: placement === 1 ? 1 : 0, podiumFinishes: placement <= 3 ? 1 : 0, totalPenalty: player.totalPenalty, phasesLaid: player.metrics.phasesLaid, meldsLaid: player.metrics.meldsLaid, jokersPlayed: player.metrics.jokersPlayed, cardsBought: player.metrics.cardsBought, timeouts: player.timeouts, reconnects: player.disconnectSkips },
            update: { gamesPlayed: { increment: 1 }, gamesWon: { increment: placement === 1 ? 1 : 0 }, podiumFinishes: { increment: placement <= 3 ? 1 : 0 }, totalPenalty: { increment: player.totalPenalty }, phasesLaid: { increment: player.metrics.phasesLaid }, meldsLaid: { increment: player.metrics.meldsLaid }, jokersPlayed: { increment: player.metrics.jokersPlayed }, cardsBought: { increment: player.metrics.cardsBought }, timeouts: { increment: player.timeouts }, reconnects: { increment: player.disconnectSkips } }
          });
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
      throw error;
    }
    return true;
  }

  async profile(userId: string) {
    const stored = await this.prisma.userStatistic.findUnique({ where: { userId } });
    const statistics = { gamesPlayed: stored?.gamesPlayed ?? 0, gamesWon: stored?.gamesWon ?? 0, podiumFinishes: stored?.podiumFinishes ?? 0, totalPenalty: stored?.totalPenalty ?? 0, phasesLaid: stored?.phasesLaid ?? 0, meldsLaid: stored?.meldsLaid ?? 0, jokersPlayed: stored?.jokersPlayed ?? 0, cardsBought: stored?.cardsBought ?? 0, timeouts: stored?.timeouts ?? 0, reconnects: stored?.reconnects ?? 0 };
    const achievements = ACHIEVEMENTS.map((definition) => {
      const value = Number(statistics[definition.field]);
      const tier = definition.tiers.filter((threshold) => value >= threshold).length;
      return { key: definition.key, title: definition.title, value, tier, tiers: definition.tiers, next: definition.tiers[tier] ?? null };
    });
    return { statistics, achievements };
  }
}
