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
}

export interface GameState {
  phase: number;
  activePlayerId: string;
  players: GamePlayerState[];
  drawPile: GameCard[];
  discardPile: GameCard[];
}

export interface PlayerGameView {
  phase: number;
  activePlayerId: string;
  drawPileCount: number;
  discardTop: GameCard;
  players: Array<{ userId: string; handCount: number; coins: number }>;
  ownHand: GameCard[];
}

export function buildDeck(playerCount: number, jokersPerPlayer: number): GameCard[] {
  const deck: GameCard[] = [];
  for (const deckNumber of [1, 2] as const) {
    for (const suit of SUITS) {
      for (const rank of RANKS) deck.push({ id: `${deckNumber}-${rank}-${suit}`, kind: "standard", deck: deckNumber, rank, suit });
    }
  }
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
  const players = playerIds.map((userId) => ({ userId, hand: cards.splice(0, 11), coins: 7 }));
  const discardTop = cards.shift();
  if (!discardTop) throw new Error("Kartensatz enthält zu wenige Karten.");
  return {
    phase: 1,
    activePlayerId: playerIds[random(playerIds.length)],
    players,
    drawPile: cards,
    discardPile: [discardTop]
  };
}

export function toPlayerGameView(state: GameState, viewerId: string): PlayerGameView {
  const ownState = state.players.find((player) => player.userId === viewerId);
  if (!ownState) throw new Error("Spieler gehört nicht zu dieser Partie.");
  return {
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    drawPileCount: state.drawPile.length,
    discardTop: state.discardPile.at(-1)!,
    players: state.players.map((player) => ({ userId: player.userId, handCount: player.hand.length, coins: player.coins })),
    ownHand: ownState.hand
  };
}
