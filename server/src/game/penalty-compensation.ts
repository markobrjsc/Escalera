import type { GameState } from "./game-state.js";

export const PENALTY_COMPENSATION_PER_COIN = 30;

export function calculateFinalPenalty(totalPenalty: number, remainingCoins: number) {
  const penalty = Math.max(0, totalPenalty);
  const availableCompensation = Math.max(0, remainingCoins) * PENALTY_COMPENSATION_PER_COIN;
  const compensatedPenalty = Math.min(penalty, availableCompensation);
  return { totalPenalty: penalty - compensatedPenalty, compensatedPenalty };
}

export function compensatedPenaltyForPlayer(state: GameState, userId: string) {
  const placement = state.placements.find((entry) => entry.userId === userId);
  if (typeof placement?.compensatedPenalty === "number") return placement.compensatedPenalty;
  const player = state.players.find((entry) => entry.userId === userId);
  return player ? calculateFinalPenalty(player.totalPenalty, player.coins).compensatedPenalty : 0;
}
