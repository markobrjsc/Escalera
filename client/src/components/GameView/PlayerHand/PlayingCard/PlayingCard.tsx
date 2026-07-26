import type { Card } from "@escalera/game-rules";
import { CardFace } from "../../../CardFace/CardFace.js";
import { cardLabel } from "../../../../lib/cards.js";

// One card in the player's hand. --card-count and --card-index drive the fan
// overlap; the pointer-down handler starts a drag, the click toggles selection.
export function PlayingCard({ card, index, count, selected, dragged, incoming, onPointerDown, onClick }: { card: Card; index: number; count: number; selected: boolean; dragged: boolean; incoming: boolean; onPointerDown: (event: React.PointerEvent) => void; onClick: () => void }) {
  return <button type="button" data-fx-card={card.id} onPointerDown={onPointerDown} aria-label={`${cardLabel(card)}${selected ? ", ausgewählt" : ", nicht ausgewählt"}`} aria-pressed={selected} onClick={onClick} className={`playing-card ${selected ? "is-selected" : ""} ${dragged ? "is-dragged" : ""} ${incoming ? "is-incoming" : ""}`} style={{ "--card-count": count, "--card-index": index } as React.CSSProperties}><span className="card-3d"><CardFace card={card} /></span></button>;
}
