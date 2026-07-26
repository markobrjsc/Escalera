import { CardFace } from "../../../../CardFace/CardFace.js";
import { cardLabel } from "../../../../../lib/cards.js";
import type { AnchorRef, Arrival, GameMeld } from "../../../../../lib/types.js";

// A single laid-out combination (group or street) in the play area.
export function MeldCard({ meld, isTarget, cardRef, onActivate, arrivals }: { meld: GameMeld; isTarget: boolean; cardRef: AnchorRef; onActivate: () => void; arrivals: Record<string, Arrival> }) {
  return <article className={`meld-card ${isTarget ? "is-target" : ""}`} data-zone={`meld:${meld.id}`} ref={cardRef} onClick={(event) => { event.stopPropagation(); onActivate(); }} aria-label={`${meld.type === "group" ? "Gruppe" : "Straße"}: ${meld.cards.map(cardLabel).join(", ")}`}><div className="meld-cards" style={{ "--meld-count": meld.cards.length } as React.CSSProperties}>{meld.cards.map((card) => <CardFace card={card} fxId={card.id} incoming={!!arrivals[card.id]} key={card.id} />)}</div></article>;
}
