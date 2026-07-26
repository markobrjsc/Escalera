import { useState } from "react";
import type { AchievementBranch } from "../../lib/types.js";
import { PanZoom } from "../PanZoom/PanZoom.js";
import { AchievementTile } from "./AchievementTile/AchievementTile.js";
import { AchievementTooltip } from "./AchievementTooltip/AchievementTooltip.js";
import type { NodePlacement, Tooltip } from "./achievements.js";

// Achievement paths spread around the root instead of growing only to the right.
// The surrounding PanZoom keeps the larger map navigable on touch and desktop.
export function AchievementTreeOverlay({ tree, username, onClose }: { tree: AchievementBranch[]; username: string; onClose: () => void }) {
  const [tip, setTip] = useState<Tooltip | null>(null);
  const tile = 64, branchStep = 112, pad = 130;
  const maxNodes = Math.max(...tree.map((branch) => branch.nodes.length));
  const radius = maxNodes * branchStep + pad;
  const width = radius * 2, height = radius * 2;
  const rootX = radius, rootY = radius;
  const recent = (at: string | null) => at !== null && Date.now() - Date.parse(at) < 30_000;

  const placements: NodePlacement[] = tree.flatMap((branch, branchIndex) => {
    const angle = -Math.PI / 2 + branchIndex * (Math.PI * 2 / tree.length);
    return branch.nodes.map((node, index) => {
      const distance = (index + 1) * branchStep;
      return { branch, node, index, x: rootX + Math.cos(angle) * distance, y: rootY + Math.sin(angle) * distance };
    });
  });
  const showTip = (placement: NodePlacement) => (event: React.PointerEvent | React.FocusEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ node: placement.node, branch: placement.branch, x: rect.left + rect.width / 2, y: rect.top });
  };

  return <div className="tree-overlay" role="dialog" aria-label={`Erfolgsbaum von ${username}`}>
    <header className="tree-overlay-bar"><div><p className="overline">Erfolgsbaum</p><h2>{username}</h2></div><button className="button-icon" onClick={onClose} aria-label="Schließen">×</button></header>
    <PanZoom className="tree-canvas-viewport" contentWidth={width} contentHeight={height}>
      <div className="tree-canvas" style={{ width, height }}>
        <svg className="tree-wires" width={width} height={height} aria-hidden="true">
          {tree.map((branch) => { const first = placements.find((placement) => placement.branch.key === branch.key && placement.index === 0); return first ? <line className={`tree-wire ${first.node.unlocked ? "is-live" : ""}`} key={`root-${branch.key}`} x1={rootX} y1={rootY} x2={first.x} y2={first.y} /> : null; })}
          {placements.filter((placement) => placement.index > 0).map((placement) => { const previous = placements.find((candidate) => candidate.branch.key === placement.branch.key && candidate.index === placement.index - 1)!; return <line className={`tree-wire ${placement.node.unlocked ? "is-live" : ""}`} key={`w-${placement.node.id}`} x1={previous.x} y1={previous.y} x2={placement.x} y2={placement.y} />; })}
        </svg>
        <div className="tree-tile is-root" style={{ left: rootX - tile / 2, top: rootY - tile / 2, width: tile, height: tile }} aria-hidden="true"><span>♠</span></div>
        {tree.map((branch) => { const first = placements.find((placement) => placement.branch.key === branch.key && placement.index === 0); return first ? <span className="tree-row-title" key={`t-${branch.key}`} style={{ left: first.x, top: first.y - tile / 2 - 20 }}>{branch.title}</span> : null; })}
        {placements.map((placement) => <AchievementTile key={placement.node.id} placement={placement} tile={tile} fresh={recent(placement.node.unlockedAt)} onShow={showTip(placement)} onHide={() => setTip(null)} />)}
      </div>
    </PanZoom>
    {tip && <AchievementTooltip tip={tip} />}
    <p className="tree-hint muted">Ziehen zum Bewegen · Scrollen oder zwei Finger zum Zoomen</p>
  </div>;
}
