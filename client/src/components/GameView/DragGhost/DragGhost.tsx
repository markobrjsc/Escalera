import type { Card } from "@escalera/game-rules";
import { CardFace } from "../../CardFace/CardFace.js";

// The picked-up card that follows the pointer while dragging.
export function DragGhost({ drag, card }: { drag: { x: number; y: number }; card: Card | null }) {
  return <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{card ? <CardFace card={card} /> : null}</div>;
}
