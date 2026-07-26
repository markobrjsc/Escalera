import { MeldCard } from "./MeldCard/MeldCard.js";
import type { Anchor, AnchorRef, Arrival, GameMeld } from "../../../../lib/types.js";

// The play area: every laid meld, or an empty-state hint when nothing is laid.
export function MeldZone({ melds, openMelds, zoneClassName, zoneRef, onZoneClick, meldRef, onMeldActivate, arrivals }: { melds: GameMeld[]; openMelds: string[]; zoneClassName: string; zoneRef: AnchorRef; onZoneClick: () => void; meldRef: Anchor; onMeldActivate: (meldId: string) => void; arrivals: Record<string, Arrival> }) {
  return <div className={`meld-zone ${zoneClassName}`} ref={zoneRef} data-zone="meldzone" onClick={onZoneClick}>
    {melds.length ? melds.map((meld) => <MeldCard key={meld.id} meld={meld} isTarget={openMelds.includes(meld.id)} cardRef={meldRef(meld.id)} onActivate={() => onMeldActivate(meld.id)} arrivals={arrivals} />) : <div className="empty-meld"><span className="empty-meld-icon">◇</span><strong>Meld-Zone</strong><span>Gruppen und Straßen erscheinen hier</span></div>}
  </div>;
}
