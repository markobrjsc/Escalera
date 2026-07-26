import { MeldCard } from "./MeldCard/MeldCard.js";
import { MeldSlotEmpty } from "./MeldSlotEmpty/MeldSlotEmpty.js";
import { emptyMeldSlotCount } from "./meldSlots.js";
import type { Anchor, AnchorRef, Arrival, GameMeld } from "../../../../lib/types.js";

// The play area: every laid meld, followed by free slots so that laying a new
// combination always has an unmistakable place to go.
export function MeldZone({ melds, openMelds, zoneClassName, zoneRef, onZoneClick, meldRef, onMeldActivate, arrivals }: { melds: GameMeld[]; openMelds: string[]; zoneClassName: string; zoneRef: AnchorRef; onZoneClick: () => void; meldRef: Anchor; onMeldActivate: (meldId: string) => void; arrivals: Record<string, Arrival> }) {
  return <div className={`meld-zone ${zoneClassName}`} ref={zoneRef} data-zone="meldzone" data-tutorial-target="meld-zone" onClick={onZoneClick}>
    {melds.map((meld) => <MeldCard key={meld.id} meld={meld} isTarget={openMelds.includes(meld.id)} cardRef={meldRef(meld.id)} onActivate={() => onMeldActivate(meld.id)} arrivals={arrivals} />)}
    {Array.from({ length: emptyMeldSlotCount(melds.length) }, (_, index) => <MeldSlotEmpty key={`slot-${index}`} />)}
  </div>;
}
