import { abbreviateThreshold, BRANCH_GLYPH, type NodePlacement } from "../achievements.js";

// One achievement node in the tree: its branch glyph and threshold value, placed
// at the position the overlay computed.
export function AchievementTile({ placement, tile, fresh, onShow, onHide }: { placement: NodePlacement; tile: number; fresh: boolean; onShow: (event: React.PointerEvent | React.FocusEvent) => void; onHide: () => void }) {
  const { node, branch } = placement;
  return <button
    className={`tree-tile ${node.unlocked ? "is-unlocked" : "is-locked"} ${fresh ? "is-fresh" : ""}`}
    style={{ left: placement.x - tile / 2, top: placement.y - tile / 2, width: tile, height: tile }}
    onPointerEnter={onShow}
    onFocus={onShow}
    onPointerLeave={onHide}
    onBlur={onHide}
    aria-label={`${branch.title}: ${node.label}${node.unlocked ? ", freigeschaltet" : ", gesperrt"}`}
  >
    <span className="tree-tile-glyph" aria-hidden="true">{BRANCH_GLYPH[branch.key] ?? "◆"}</span>
    <span className="tree-tile-value">{abbreviateThreshold(node.threshold)}</span>
  </button>;
}
