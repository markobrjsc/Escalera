import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { observeVisualCompletion, usePrefersReducedMotion } from "../../lib/motion.js";

/* ---------------------------------------------------------------- SlideStage
   Cross-view transitions (#50): when the view key changes, the previous view
   keeps rendering in a wrapper that slides off screen while the new one slides
   in from the opposite edge. Wrappers carry stable keys, so React keeps the old
   view's component instances alive during the exit — no state resets mid-slide.
   Entering the gamefield uses "cover" instead: the lobby fades out underneath
   the match intro overlay rather than sliding. */
const VIEW_ORDER: Record<string, number> = { access: 0, list: 1, lobby: 2, game: 3 };

type ViewSnapshot = { key: string; node: ReactNode };
type Leaving = ViewSnapshot & { id: number; enter: string; leave: string };
type SlideScene = { key: string; leaving: Leaving | null };

export function SlideStage({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  const reduced = usePrefersReducedMotion();
  const committed = useRef<ViewSnapshot>({ key: viewKey, node: children });
  const sequence = useRef(0);
  const leavingElement = useRef<HTMLDivElement>(null);
  const [scene, setScene] = useState<SlideScene>({ key: viewKey, leaving: null });

  // Keep the committed view alive for one layout pass when the key changes.
  // The synchronous layout update then moves the same keyed wrapper into the
  // leaving slot and mounts its successor before the browser paints.
  useLayoutEffect(() => {
    const previous = committed.current;
    if (previous.key === viewKey) {
      committed.current = { key: viewKey, node: children };
      if (reduced) setScene((current) => current.leaving ? { ...current, leaving: null } : current);
      return;
    }

    const cover = viewKey === "game";
    const back = (VIEW_ORDER[viewKey] ?? 0) < (VIEW_ORDER[previous.key] ?? 0);
    const leaving: Leaving = {
      ...previous,
      id: ++sequence.current,
      enter: cover ? "" : back ? "slide-from-left" : "slide-from-right",
      leave: cover ? "fade-under" : back ? "slide-to-right" : "slide-to-left"
    };
    committed.current = { key: viewKey, node: children };
    setScene({ key: viewKey, leaving: reduced ? null : leaving });
  }, [children, reduced, viewKey]);

  const finishLeaving = (id: number) => {
    setScene((current) => current.leaving?.id === id ? { ...current, leaving: null } : current);
  };

  // animationend is the fast path. The WAAPI observer also handles animation
  // cancellation and the no-animation reduced-motion case without a timer.
  useLayoutEffect(() => {
    const leaving = scene.leaving;
    const element = leavingElement.current;
    if (!leaving || !element) return;
    return observeVisualCompletion(element, () => finishLeaving(leaving.id));
  }, [scene.leaving?.id]);

  const waitingForLayout = scene.key !== viewKey;
  const activeKey = waitingForLayout ? committed.current.key : viewKey;
  const activeNode = waitingForLayout ? committed.current.node : children;
  return <>
    {scene.leaving && <div
      className={`view-slide is-leaving ${scene.leaving.leave}`}
      key={scene.leaving.key}
      ref={leavingElement}
      aria-hidden="true"
      {...{ inert: true }}
      onAnimationEnd={(event) => { if (event.currentTarget === event.target) finishLeaving(scene.leaving!.id); }}
    >{scene.leaving.node}</div>}
    <div className={`view-slide ${scene.leaving?.enter ?? ""}`} key={activeKey}>{activeNode}</div>
  </>;
}
