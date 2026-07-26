import { useEffect } from "react";
import type { AchievementNode } from "../../lib/types.js";

// Unlock notifications: each fresh achievement pops top-right and dismisses itself
// after ~8s. Purely presentational — the unlock itself is already persisted.
export function AchievementToasts({ unlocks, onDismiss }: { unlocks: AchievementNode[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timers = unlocks.map((node) => window.setTimeout(() => onDismiss(node.id), 8000));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [unlocks, onDismiss]);
  if (!unlocks.length) return null;
  return <div className="achievement-toasts" role="status" aria-live="polite">{unlocks.map((node) => <button className="achievement-toast" key={node.id} onClick={() => onDismiss(node.id)}><span className="toast-star" aria-hidden="true">★</span><div><strong>Erfolg freigeschaltet</strong><span>{node.label}</span></div></button>)}</div>;
}
