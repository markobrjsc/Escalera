export type ScoreRound = {
  round: number;
  scores: Array<{ userId: string; penalty: number }>;
};

export type ScorePlayer = { userId: string; totalPenalty: number };

export function buildScoreboardRows(rounds: readonly ScoreRound[], players: readonly ScorePlayer[]) {
  return players.map((player) => {
    const penalties = rounds.map((round) => round.scores.find((score) => score.userId === player.userId)?.penalty ?? null);
    const historyTotal = penalties.reduce<number>((sum, penalty) => sum + (penalty ?? 0), 0);
    return {
      userId: player.userId,
      penalties,
      totalPenalty: rounds.length ? historyTotal : player.totalPenalty
    };
  }).sort((a, b) => a.totalPenalty - b.totalPenalty || a.userId.localeCompare(b.userId));
}
