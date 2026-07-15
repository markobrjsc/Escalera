import { randomInt } from "node:crypto";

const SUITS = ["clubs", "diamonds", "hearts", "spades"] as const;
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;

export type GameCard =
  | { id: string; kind: "standard"; deck: 1 | 2; rank: (typeof RANKS)[number]; suit: (typeof SUITS)[number] }
  | { id: string; kind: "joker" };

export interface GamePlayerState {
  userId: string;
  hand: GameCard[];
  coins: number;
  phaseLaid: boolean;
  totalPenalty: number;
}

export interface GameMeld {
  id: string;
  ownerId: string;
  type: "group" | "street";
  cards: GameCard[];
  sameSuit: boolean;
}

export interface RoundResult {
  round: number;
  phase: number;
  endedById: string;
  scores: Array<{ userId: string; penalty: number; totalPenalty: number }>;
}

export interface FinalPlacement {
  userId: string;
  rank: number;
  totalPenalty: number;
}

export interface GameState {
  status: "ACTIVE" | "FINISHED";
  round: number;
  phase: number;
  jokersPerPlayer: number;
  activePlayerId: string;
  players: GamePlayerState[];
  drawPile: GameCard[];
  discardPile: GameCard[];
  melds: GameMeld[];
  turn: { hasDrawn: boolean };
  discardOffer: { cardId: string; offeredById: string } | null;
  roundEndedById: string | null;
  roundResults: RoundResult[];
  placements: FinalPlacement[];
}

export interface PlayerGameView {
  status: "ACTIVE" | "FINISHED";
  round: number;
  phase: number;
  activePlayerId: string;
  drawPileCount: number;
  discardTop: GameCard | null;
  discardOffer: { available: boolean; cardId: string } | null;
  turn: { hasDrawn: boolean; canAct: boolean };
  melds: GameMeld[];
  roundEndedById: string | null;
  lastRoundResult: RoundResult | null;
  placements: FinalPlacement[];
  players: Array<{ userId: string; handCount: number; coins: number; phaseLaid: boolean; totalPenalty: number }>;
  ownHand: GameCard[];
}

export function buildDeck(playerCount: number, jokersPerPlayer: number): GameCard[] {
  const deck: GameCard[] = [];
  for (const deckNumber of [1, 2] as const) for (const suit of SUITS) for (const rank of RANKS) deck.push({ id: `${deckNumber}-${rank}-${suit}`, kind: "standard", deck: deckNumber, rank, suit });
  for (let joker = 1; joker <= playerCount * jokersPerPlayer; joker += 1) deck.push({ id: `joker-${joker}`, kind: "joker" });
  return deck;
}

export function shuffle<T>(cards: readonly T[], random: (upperExclusive: number) => number = randomInt): T[] {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = random(index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function createInitialGameState(playerIds: readonly string[], jokersPerPlayer: number, random: (upperExclusive: number) => number = randomInt): GameState {
  if (playerIds.length < 2 || playerIds.length > 6) throw new Error("Eine Partie benötigt zwei bis sechs Spieler.");
  const cards = shuffle(buildDeck(playerIds.length, jokersPerPlayer), random);
  const players = playerIds.map((userId) => ({ userId, hand: cards.splice(0, 11), coins: 7, phaseLaid: false, totalPenalty: 0 }));
  const discardTop = cards.shift();
  if (!discardTop) throw new Error("Kartensatz enthält zu wenige Karten.");
  return { status: "ACTIVE", round: 1, phase: 1, jokersPerPlayer, activePlayerId: playerIds[random(playerIds.length)], players, drawPile: cards, discardPile: [discardTop], melds: [], turn: { hasDrawn: false }, discardOffer: null, roundEndedById: null, roundResults: [], placements: [] };
}

export function normalizeGameState(state: GameState): GameState {
  const allCards = [...state.players.flatMap((player) => player.hand), ...state.drawPile, ...state.discardPile, ...(state.melds ?? []).flatMap((meld) => meld.cards)];
  const jokerCount = new Set(allCards.filter((card) => card.kind === "joker").map((card) => card.id)).size;
  return {
    ...state,
    status: state.status ?? "ACTIVE",
    round: state.round ?? state.phase ?? 1,
    jokersPerPlayer: state.jokersPerPlayer ?? Math.round(jokerCount / state.players.length),
    players: state.players.map((player) => ({ ...player, phaseLaid: player.phaseLaid ?? false, totalPenalty: player.totalPenalty ?? 0 })),
    melds: state.melds ?? [],
    turn: state.turn ?? { hasDrawn: false },
    discardOffer: state.discardOffer ?? null,
    roundEndedById: state.roundEndedById ?? null,
    roundResults: state.roundResults ?? [],
    placements: state.placements ?? []
  };
}

export function toPlayerGameView(rawState: GameState, viewerId: string): PlayerGameView {
  const state = normalizeGameState(rawState);
  const ownState = state.players.find((player) => player.userId === viewerId);
  if (!ownState) throw new Error("Spieler gehört nicht zu dieser Partie.");
  return {
    status: state.status,
    round: state.round,
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    drawPileCount: state.drawPile.length,
    discardTop: state.discardPile.at(-1) ?? null,
    discardOffer: state.discardOffer && viewerId !== state.activePlayerId && viewerId !== state.discardOffer.offeredById ? { available: true, cardId: state.discardOffer.cardId } : null,
    turn: { hasDrawn: state.turn.hasDrawn, canAct: viewerId === state.activePlayerId && !state.roundEndedById },
    melds: state.melds,
    roundEndedById: state.roundEndedById,
    lastRoundResult: state.roundResults.at(-1) ?? null,
    placements: state.placements,
    players: state.players.map((player) => ({ userId: player.userId, handCount: player.hand.length, coins: player.coins, phaseLaid: player.phaseLaid, totalPenalty: player.totalPenalty })),
    ownHand: ownState.hand
  };
}
