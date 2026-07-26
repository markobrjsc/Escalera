import type { Card } from "@escalera/game-rules";
import { PileStack } from "../../../PileStack/PileStack.js";
import type { AnchorRef } from "../../../../lib/types.js";

// A draw or discard pile: the framed drop slot with its shared PileStack visual
// and the count label below. Reused for both piles on the board and in the
// design lab.
export function PileStation({ zone, zoneClassName, onZoneClick, buttonRef, buttonClassName, ariaLabel, disabled, stackCount, stackTop, kind, label, count, tutorialTarget }: { zone?: string; zoneClassName: string; onZoneClick?: () => void; buttonRef: AnchorRef; buttonClassName: string; ariaLabel: string; disabled?: boolean; stackCount: number; stackTop: Card | null; kind: "draw" | "discard"; label: string; count: number; tutorialTarget?: string }) {
  return <div className="pile-station" data-tutorial-target={tutorialTarget}>
    <div className={`pile-slot ${zoneClassName}`} data-zone={zone} onClick={onZoneClick}><button ref={buttonRef} type="button" className={buttonClassName} aria-label={ariaLabel} disabled={disabled}><PileStack count={stackCount} top={stackTop} kind={kind} /></button></div>
    <span>{label} <b>[ {count} ]</b></span>
  </div>;
}
