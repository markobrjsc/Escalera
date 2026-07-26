import type { Card } from "@escalera/game-rules";
import { PlayingCard } from "./PlayingCard/PlayingCard.js";
import type { AnchorRef, Arrival } from "../../../lib/types.js";

// The player's fanned hand. handRef anchors outbound flights; each card is a
// PlayingCard.
export function PlayerHand({ handRef, cards, selected, dragCardId, arrivals, startDrag, toggleCard }: { handRef: AnchorRef; cards: Card[]; selected: string[]; dragCardId: string | null; arrivals: Record<string, Arrival>; startDrag: (card: Card) => (event: React.PointerEvent) => void; toggleCard: (cardId: string) => void }) {
  return <section className="player-hand" data-tutorial-target="player-hand" ref={handRef}><div className="hand-cards" role="group" aria-label="Deine Handkarten">{cards.map((card, index) => <PlayingCard key={card.id} card={card} index={index} count={cards.length} selected={selected.includes(card.id)} dragged={dragCardId === card.id} incoming={!!arrivals[card.id]} onPointerDown={startDrag(card)} onClick={() => toggleCard(card.id)} />)}</div></section>;
}
