import { tooltipLines, type Tooltip } from "../achievements.js";

// Hover/focus tooltip for an achievement node, anchored above the tile.
export function AchievementTooltip({ tip }: { tip: Tooltip }) {
  const lines = tooltipLines(tip.branch, tip.node);
  return <div className="tree-tooltip" style={{ left: tip.x, top: tip.y }} role="tooltip">
    <strong>{tip.node.label}</strong>
    <span className="tree-tooltip-branch">{tip.branch.title}</span>
    <span className="tree-tooltip-done">{lines.done}</span>
    <span className="tree-tooltip-need">{lines.need}</span>
  </div>;
}
