import { describe, expect, it } from "vitest";
import { buildScoreboardRows } from "./scoreboard.js";

describe("Scoreboard-Rundenhistorie", () => {
  it("zeigt jede Rundenstrafe und bildet daraus exakt die Gesamtsumme", () => {
    const rows = buildScoreboardRows([
      { round: 1, scores: [{ userId: "a", penalty: 0 }, { userId: "b", penalty: 12 }] },
      { round: 2, scores: [{ userId: "a", penalty: 8 }, { userId: "b", penalty: 3 }] }
    ], [{ userId: "a", totalPenalty: 8 }, { userId: "b", totalPenalty: 15 }]);

    expect(rows).toEqual([
      { userId: "a", penalties: [0, 8], totalPenalty: 8 },
      { userId: "b", penalties: [12, 3], totalPenalty: 15 }
    ]);
  });

  it("kennzeichnet eine fehlende Spielerwertung statt sie als Null auszugeben", () => {
    const [row] = buildScoreboardRows([{ round: 1, scores: [] }], [{ userId: "a", totalPenalty: 0 }]);
    expect(row.penalties).toEqual([null]);
  });
});
