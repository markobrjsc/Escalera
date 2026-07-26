import { RANKS, SUITS, type Rank, type Suit } from "@escalera/game-rules";

export const PHASE_REQUIREMENTS: Record<number, string> = {
  1: "3 gleiche Werte",
  2: "2 × 3 gleiche Werte",
  3: "4 gleiche Werte",
  4: "2 × 4 gleiche Werte",
  5: "5 gleiche Werte",
  6: "2 × 5 gleiche Werte",
  7: "7er-Straße · gleiches Zeichen"
};

export const PHASE_PREVIEW_INTERVAL_MS = 1_800;

type GroupCount = 1 | 2;
type GroupSize = 3 | 4 | 5;

export type PhasePreviewCard = { rank: Rank; suit: Suit };
export type PhasePreview =
  | { kind: "groups"; groups: GroupCount; size: GroupSize; cards: PhasePreviewCard[] }
  | { kind: "street"; groups: 1; size: 7; cards: PhasePreviewCard[] }
  | { kind: "unknown"; groups: 0; size: 0; cards: [] };

const GROUP_REQUIREMENTS: Partial<Record<number, { groups: GroupCount; size: GroupSize }>> = {
  1: { groups: 1, size: 3 },
  2: { groups: 2, size: 3 },
  3: { groups: 1, size: 4 },
  4: { groups: 2, size: 4 },
  5: { groups: 1, size: 5 },
  6: { groups: 2, size: 5 }
};

function wrappedIndex(step: number, length: number) {
  const integer = Number.isFinite(step) ? Math.trunc(step) : 0;
  return ((integer % length) + length) % length;
}

export function phaseRequirement(phase: number) {
  return PHASE_REQUIREMENTS[phase] ?? "Phasenziel ansehen";
}

export function phasePreview(phase: number, step = 0): PhasePreview {
  const requirement = GROUP_REQUIREMENTS[phase];
  const rankIndex = wrappedIndex(step, RANKS.length);
  if (requirement) {
    return {
      kind: "groups",
      ...requirement,
      cards: Array.from({ length: requirement.size }, (_, index) => ({
        rank: RANKS[rankIndex],
        suit: SUITS[(index + rankIndex) % SUITS.length]
      }))
    };
  }

  if (phase === 7) {
    const suit = SUITS[wrappedIndex(step, SUITS.length)];
    return {
      kind: "street",
      groups: 1,
      size: 7,
      cards: Array.from({ length: 7 }, (_, index) => ({
        rank: RANKS[(rankIndex + index) % RANKS.length],
        suit
      }))
    };
  }

  return { kind: "unknown", groups: 0, size: 0, cards: [] };
}
