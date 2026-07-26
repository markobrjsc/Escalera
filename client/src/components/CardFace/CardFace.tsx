import type { Card } from "@escalera/game-rules";
import { cardAsset, cardLabel } from "../../lib/cards.js";

// fxId marks a card as an animation target: flight arrivals look the element up
// via [data-fx-card] and keep it hidden (incoming) until the flight lands on it.
export function CardFace({ card, fxId, incoming }: { card: Card; fxId?: string; incoming?: boolean }) {
  return <img className={`card-face ${incoming ? "is-incoming" : ""}`} data-fx-card={fxId} src={cardAsset(card)} alt={cardLabel(card)} draggable={false} />;
}
