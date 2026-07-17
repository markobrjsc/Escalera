export const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
export const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface StandardCard {
  id: string;
  deck: 1 | 2;
  rank: Rank;
  suit: Suit;
  kind: "standard";
}

export interface JokerCard {
  id: string;
  kind: "joker";
}

export type Card = StandardCard | JokerCard;

/**
 * Shared timing contract for the initial gamefield choreography. Keeping these
 * values in the rules package lets the client timeline and the authoritative
 * server start barrier use the same duration.
 */
export const GAME_START_TIMING_MS = {
  matchIntro: 2_100,
  introDealOverlap: 600,
  deckDrop: 750,
  deckShuffle: 2_250,
  dealStep: 95,
  dealFlight: 460,
  finishTail: 900
} as const;

export const INITIAL_HAND_SIZE = 11;

export function gameStartDurationMs(playerCount: number): number {
  if (!Number.isInteger(playerCount) || playerCount < 2 || playerCount > 6) throw new RangeError("Eine Partie benötigt zwei bis sechs Spieler.");
  const dealStart = GAME_START_TIMING_MS.matchIntro - GAME_START_TIMING_MS.introDealOverlap
    + GAME_START_TIMING_MS.deckDrop
    + GAME_START_TIMING_MS.deckShuffle;
  return dealStart
    + playerCount * INITIAL_HAND_SIZE * GAME_START_TIMING_MS.dealStep
    + GAME_START_TIMING_MS.dealFlight
    + GAME_START_TIMING_MS.finishTail;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export function cardPoints(card: Card): number {
  if (card.kind === "joker") return 30;
  if (["2", "3", "4", "5", "6", "7"].includes(card.rank)) return 5;
  if (card.rank === "A") return 15;
  return 10;
}

export function handPoints(cards: readonly Card[]): number {
  return cards.reduce((total, card) => total + cardPoints(card), 0);
}

function jokerCount(cards: readonly Card[]): number {
  return cards.filter((card) => card.kind === "joker").length;
}

export function validateGroup(cards: readonly Card[], minimumSize = 3): ValidationResult {
  if (cards.length < minimumSize) return { valid: false, reason: "Zu wenige Karten." };
  if (jokerCount(cards) > 1) return { valid: false, reason: "Pro Kombination ist nur ein Joker erlaubt." };

  const ranks = new Set(cards.filter((card): card is StandardCard => card.kind === "standard").map((card) => card.rank));
  if (ranks.size > 1) return { valid: false, reason: "Eine Gruppe braucht gleiche Kartenwerte." };
  if (ranks.size === 0 && cards.length < minimumSize) return { valid: false, reason: "Ungültige Jokergruppe." };
  return { valid: true };
}

function rankIndex(rank: Rank): number {
  return RANKS.indexOf(rank);
}

export function validateStreet(cards: readonly Card[], options: { minimumSize?: number; sameSuit?: boolean } = {}): ValidationResult {
  const minimumSize = options.minimumSize ?? 3;
  if (cards.length < minimumSize) return { valid: false, reason: "Zu wenige Karten." };
  if (cards.length > RANKS.length) return { valid: false, reason: "Eine Straße darf keinen Kartenwert wiederholen." };
  if (jokerCount(cards) > 1) return { valid: false, reason: "Pro Kombination ist nur ein Joker erlaubt." };

  const standardCards = cards.filter((card): card is StandardCard => card.kind === "standard");
  const seenRanks = new Set(standardCards.map((card) => card.rank));
  if (seenRanks.size !== standardCards.length) return { valid: false, reason: "Eine Straße darf keinen Kartenwert wiederholen." };
  if (options.sameSuit && new Set(standardCards.map((card) => card.suit)).size > 1) return { valid: false, reason: "Diese Straße muss dieselbe Farbe haben." };

  const joker = jokerCount(cards);
  if (standardCards.length === 0) return { valid: true };

  const indexes = standardCards.map((card) => rankIndex(card.rank));
  for (const start of indexes) {
    const expected = new Set<number>();
    for (let offset = 0; offset < cards.length; offset += 1) expected.add((start + offset) % RANKS.length);
    const missing = [...expected].filter((index) => !indexes.includes(index)).length;
    if (missing === joker && indexes.every((index) => expected.has(index))) return { valid: true };
  }
  return { valid: false, reason: "Kartenwerte bilden keine gültige Straße." };
}

export function validatePhase(phase: Phase, combinations: readonly (readonly Card[])[]): ValidationResult {
  const groupRequirements: Partial<Record<Phase, { groups: number; minimumSize: number }>> = {
    1: { groups: 1, minimumSize: 3 },
    2: { groups: 2, minimumSize: 3 },
    3: { groups: 1, minimumSize: 4 },
    4: { groups: 2, minimumSize: 4 },
    5: { groups: 1, minimumSize: 5 },
    6: { groups: 2, minimumSize: 5 }
  };

  if (phase === 7) {
    if (combinations.length !== 1) return { valid: false, reason: "Phase 7 benötigt genau eine Escalera." };
    return validateStreet(combinations[0], { minimumSize: 7, sameSuit: true });
  }

  const requirement = groupRequirements[phase];
  if (!requirement || combinations.length !== requirement.groups) return { valid: false, reason: "Falsche Anzahl geforderter Gruppen." };
  return combinations.reduce<ValidationResult>((result, combination) => result.valid ? validateGroup(combination, requirement.minimumSize) : result, { valid: true });
}
