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

// fxId marks a card as an animation target: flight arrivals look the element up
// via [data-fx-card] and keep it hidden (incoming) until the flight lands on it.
export function CardFace({ card, fxId, incoming }: { card: Card; fxId?: string; incoming?: boolean }) {
  return <img className={`card-face ${incoming ? "is-incoming" : ""}`} data-fx-card={fxId} src={cardAsset(card)} alt={cardLabel(card)} draggable={false} />;
}

// Deterministic jitter: the same absolute card index always yields the same
// angle/offset, so a discard pile keeps its history in place while every newly
// dropped card lands at its own fresh angle.
function jitter(seed: number, spread: number) { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return ((n - Math.floor(n)) * 2 - 1) * spread; }

/* The shared pile visual (#51): a stack whose visible depth grows with the card
   count. The draw pile is a squared-up deck (neat edge offsets), the discard a
   loose drop pile (each layer keeps the angle it landed with). The top face sits
   on layered under-cards; the striped side edge below is drawn by PileStack's
   ::before, which reads the normalized --pile-fill value from here. */
export function PileStack({ count, top, kind }: { count: number; top: Card | null; kind: "draw" | "discard" }) {
  if (count <= 0 && !top) return <span className="pile-stack is-empty" style={{ "--pile-depth": 0 } as React.CSSProperties}><strong className="pile-empty">Leer</strong></span>;
  const visibleCount = Math.max(count, top ? 1 : 0);
  const capacity = kind === "draw" ? 108 : 60;
  const fill = Math.min(1, Math.sqrt(visibleCount / capacity));
  const layers = Math.min(visibleCount - 1, Math.max(Math.min(3, visibleCount - 1), Math.ceil(fill * 6)));
  const messy = kind === "discard";
  const firstVisible = visibleCount - layers - 1;
  return <span className={`pile-stack ${messy ? "is-messy" : "is-neat"}`} style={{ "--pile-depth": visibleCount, "--pile-fill": fill } as React.CSSProperties}>
    {Array.from({ length: layers + 1 }, (_, index) => {
      const cardIndex = firstVisible + index;
      const isTop = index === layers;
      const depth = layers - index;
      const style = {
        "--layer-x": `${messy ? jitter(cardIndex, 5.5) : isTop ? 0 : jitter(cardIndex, .65)}%`,
        "--layer-y": messy ? `${jitter(cardIndex + .5, 3.6)}%` : isTop ? "0px" : `calc(${depth} * var(--pile-lift, 2px))`,
        "--layer-r": `${messy ? jitter(cardIndex + 7, 6.5) : isTop ? 0 : jitter(cardIndex + 7, .55)}deg`,
        zIndex: index + 1
      } as React.CSSProperties;
      if (isTop) return <span className="pile-top" style={style} key={`${kind}-${cardIndex}`}>{top ? <CardFace card={top} /> : <img src={CARD_BACK} alt="" draggable={false} />}</span>;
      return <span className={`pile-layer ${messy ? "is-face" : "is-back"}`} style={style} key={`${kind}-${cardIndex}`} aria-hidden="true">{messy ? null : <img src={CARD_BACK} alt="" draggable={false} />}</span>;
    })}
  </span>;
}
