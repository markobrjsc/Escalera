import type { Card } from "@escalera/game-rules";
import { CARD_BACK } from "../../lib/cards.js";
import { CardFace } from "../CardFace/CardFace.js";

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
  // A draw deck is one squared, solid object. Showing several complete backs
  // beneath it reads as duplicate cards rather than a clean card edge.
  const layers = kind === "draw" ? 0 : Math.min(visibleCount - 1, Math.max(Math.min(3, visibleCount - 1), Math.ceil(fill * 6)));
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
