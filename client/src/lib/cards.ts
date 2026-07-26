// Pure card helpers shared by the CardFace/PileStack components and the game
// choreography. Extracted from the former cards.tsx (#89).
import type { Card } from "@escalera/game-rules";

export const CARD_BACK = "/cards/CB.png";

export function suitSymbol(suit: string) { return ({ clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" } as Record<string, string>)[suit] ?? "?"; }
export function cardLabel(card: Card) { return card.kind === "joker" ? "Joker" : `${card.rank} ${suitSymbol(card.suit)}`; }
export function cardAsset(card: Card) { if (card.kind === "joker") return "/cards/J.png"; const rank = card.rank === "10" ? "T" : card.rank; const suit = ({ clubs: "C", diamonds: "D", hearts: "H", spades: "S" } as Record<string, string>)[card.suit]; return `/cards/${rank}${suit}.svg`; }
export function cardSort(a: Card, b: Card, mode: "rank" | "suit") {
  if (a.kind === "joker" || b.kind === "joker") {
    if (a.kind === b.kind) return a.id.localeCompare(b.id);
    return a.kind === "joker" ? 1 : -1;
  }
  const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const suits = ["clubs", "diamonds", "hearts", "spades"];
  const rankDelta = ranks.indexOf(a.rank) - ranks.indexOf(b.rank);
  const suitDelta = suits.indexOf(a.suit) - suits.indexOf(b.suit);
  return (mode === "rank" ? rankDelta || suitDelta : suitDelta || rankDelta) || a.id.localeCompare(b.id);
}
