import type { AchievementBranch, AchievementNode } from "../../lib/types.js";

export function abbreviateThreshold(value: number) { return value >= 1000 ? `${value % 1000 === 0 ? value / 1000 : (value / 1000).toFixed(1)}k` : String(value); }

export const BRANCH_GLYPH: Record<string, string> = { phases: "❖", streets: "≣", wins: "★", market: "⛁", penalty: "⚠", coins: "◉", moves: "♟" };

export type NodePlacement = { branch: AchievementBranch; node: AchievementNode; index: number; x: number; y: number };
export type Tooltip = { node: AchievementNode; branch: AchievementBranch; x: number; y: number };

// Hover text: what you have already achieved and what is still required.
export function tooltipLines(branch: AchievementBranch, node: AchievementNode): { done: string; need: string } {
  if (node.unlocked) {
    const when = node.unlockedAt ? new Date(node.unlockedAt).toLocaleDateString("de-DE") : null;
    return { done: `Freigeschaltet${when ? ` am ${when}` : ""}`, need: "Erledigt ✓" };
  }
  if (branch.kind === "phase") return { done: "Noch nicht gewonnen", need: `Beende die Runde in Phase ${node.threshold} als Erster.` };
  return { done: `Aktuell: ${branch.value} / ${node.threshold}`, need: `Noch ${node.threshold - branch.value} bis „${node.label}“.` };
}
