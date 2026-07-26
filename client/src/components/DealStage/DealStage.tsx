import { CARD_BACK } from "../../lib/cards.js";
import type { Rect } from "../../lib/motion.js";

/* ----------------------------------------------------------------- DealStage
   The deck's grand entrance (#50): drops in from above onto the draw slot,
   then riffle-shuffles — the deck splits into two tilted halves that zip back
   together, three times — and squares up. Rendered at the measured draw-pile
   rect; all motion lives in animations.css. Also mounted standalone on the
   /design/piles route so the choreography can be tuned in isolation (#51). */
export function DealStage({ rect, stage }: { rect: Rect; stage: "drop" | "shuffle" }) {
  // The pile lives in a tilted board and its screen-space bounding box is too
  // wide. The intro deck must remain a real 5:7 card just like FlightCard.
  const width = Math.min(rect.width, rect.height * 5 / 7);
  const height = width * 7 / 5;
  const style = { left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2, width, height } as React.CSSProperties;
  return <div className="deal-stage" data-stage={stage} aria-hidden="true">
    <div className="deal-deck" style={style}><img src={CARD_BACK} alt="" draggable={false} /></div>
    {stage === "shuffle" && <>
      <div className="deal-half deal-half-a" style={style}><img src={CARD_BACK} alt="" draggable={false} /></div>
      <div className="deal-half deal-half-b" style={style}><img src={CARD_BACK} alt="" draggable={false} /></div>
    </>}
  </div>;
}
