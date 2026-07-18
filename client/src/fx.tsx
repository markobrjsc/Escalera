import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GAME_START_TIMING_MS } from "@escalera/game-rules";
import { CARD_BACK } from "./cards.js";

// Public timing values live next to the components that own them. Consumers
// should prefer observeVisualCompletion() for teardown and use these only when
// a defensive fallback or a coordinated timeline is required.
export const VIEW_TRANSITION_MS = 560;
export const DIALOG_EXIT_MS = 240;
export const MATCH_INTRO_MS = GAME_START_TIMING_MS.matchIntro;
export const MATCH_INTRO_REDUCED_MS = 1500;
export const DEFAULT_FLIGHT_MS = 520;
export const REDUCED_FLIGHT_MS = 480;

/* Motion preference: the OS reduced-motion signal can be overridden per device
   via ?motion=full / ?motion=auto (persisted to localStorage) — Windows turns
   "Animationseffekte" off system-wide surprisingly often, and players who
   explicitly want the table animations need a way back. The resolved value is
   mirrored as a .motion-reduced class on <html> so stylesheets can key off it
   (CSS media queries cannot see the override). */
function motionOverride(): boolean {
  try {
    const requested = new URLSearchParams(window.location.search).get("motion");
    if (requested === "full" || requested === "auto") localStorage.setItem("escalera-motion", requested);
    return localStorage.getItem("escalera-motion") === "full";
  } catch { return false; }
}

export function reducedMotionActive() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches && !motionOverride(); }

export function initMotionPreference() {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => document.documentElement.classList.toggle("motion-reduced", query.matches && !motionOverride());
  apply();
  query.addEventListener("change", apply);
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(reducedMotionActive);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReduced(reducedMotionActive());
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

/**
 * Runs a callback once every animation currently attached to an element has
 * either finished or been removed. An element without animations completes in
 * a microtask, which gives reduced-motion styles a synchronous, timer-free
 * path. Calling the returned disposer suppresses the callback.
 */
export function observeVisualCompletion(element: Element, onComplete: () => void, subtree = false) {
  let active = true;
  let completed = false;
  const complete = () => {
    if (!active || completed) return;
    completed = true;
    onComplete();
  };
  const animations = element.getAnimations({ subtree });
  if (animations.length === 0) queueMicrotask(complete);
  else void Promise.allSettled(animations.map((animation) => animation.finished)).then(complete);
  return () => { active = false; };
}

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

/* ---------------------------------------------------------- MatchStartOverlay
   Plays once when a lobby where everyone readied up turns into a running game:
   a card fan bursts open over a dark backdrop, the round title lands, then the
   whole overlay fades and reveals the gamefield (whose deal choreography is
   timed to begin as this clears). Purely presentational. */
export function MatchStartOverlay({ round, phase }: { round: number; phase: number }) {
  // `inert` is the only reliable way to block pointer, keyboard and assistive
  // technology access to the already-mounted gamefield. Observe the stage so a
  // rapid view replacement during the intro is locked as well.
  useLayoutEffect(() => {
    const managed = new Set<HTMLElement>();
    const lockViews = () => {
      document.querySelectorAll<HTMLElement>(".view-slide").forEach((element) => {
        managed.add(element);
        element.inert = true;
      });
    };
    lockViews();
    const root = document.getElementById("root");
    const observer = root ? new MutationObserver(lockViews) : null;
    observer?.observe(root!, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
      // A keyed wrapper can change from leaving to current during a rapid
      // replacement. Restore SlideStage's contract from its final role rather
      // than an obsolete value captured when the intro began.
      managed.forEach((element) => { element.inert = element.classList.contains("is-leaving"); });
    };
  }, []);

  return <div className="match-intro" role="status" aria-live="assertive" aria-atomic="true">
    <div className="match-intro-fan">{[0, 1, 2, 3, 4].map((index) => <img src={CARD_BACK} alt="" style={{ "--i": index - 2, "--d": Math.abs(index - 2) } as React.CSSProperties} key={index} />)}</div>
    <p className="match-intro-kicker">Alle Spieler bereit</p>
    <h2 className="match-intro-title">Los geht’s!</h2>
    <p className="match-intro-phase">Runde {round} · Phase {phase}</p>
  </div>;
}

/* -------------------------------------------------------------- Card flights
   One overlay element per travelling card. The outer node translates/scales
   from the source rect to the target rect (morphing pile size ↔ hand size on
   the way); the inner node is double-faced and can flip back→front inside a
   window of the flight. Rects are screen-space, so the board's 3D tilt never
   disturbs a flight. */
export type Rect = { left: number; top: number; width: number; height: number };

export type FlightSpec = {
  key: string;
  from: Rect;
  to: Rect;
  face: string;
  showBack?: boolean;
  flip?: { start: number; end: number };
  via?: { dx: number; dy: number };
  // rotateX at the endpoints: the board is tilted ~25°, the hand and the HUD
  // seats are flat. Interpolating the tilt keeps a card visually "on the
  // table" while it leaves a pile and levels out toward the hand.
  fromTilt?: number;
  toTilt?: number;
  duration?: number;
  delay?: number;
  onArrive?: () => void;
};

// The tilt applied to cards that sit on the 3D board (piles, melds).
export const BOARD_TILT = 22;

// A card-shaped rect (5:7) centred inside an arbitrary target box — flights to
// player seats land as a small card, not stretched to the seat's outline.
export function fitCardRect(target: Rect, scale = 0.86): Rect {
  const height = target.height * scale;
  const width = height * 5 / 7;
  return { left: target.left + (target.width - width) / 2, top: target.top + (target.height - height) / 2, width, height };
}

export function FlightLayer({ flights, reduced, onDone }: { flights: FlightSpec[]; reduced: boolean; onDone: (key: string) => void }) {
  if (!flights.length) return null;
  return <div className="fx-layer" aria-hidden="true">{flights.map((flight) => <FlightCard flight={flight} reduced={reduced} onDone={() => onDone(flight.key)} key={flight.key} />)}</div>;
}

function FlightCard({ flight, reduced, onDone }: { flight: FlightSpec; reduced: boolean; onDone: () => void }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const element = outer.current; const faces = inner.current;
    if (!element || !faces) return;
    let disposed = false;
    let finished = false;
    const animations: Animation[] = [];
    // getBoundingClientRect() of the tilted board is not card-shaped. Fit a
    // canonical 5:7 card inside both endpoint boxes before animating; this
    // prevents the image itself from being stretched or cropped in flight.
    const fit = (rect: Rect): Rect => {
      const width = Math.min(rect.width, rect.height * 5 / 7);
      const height = width * 7 / 5;
      return { width, height, left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2 };
    };
    const from = fit(flight.from); const to = fit(flight.to);
    const scale = to.width / Math.max(1, from.width);
    const start = `translate(${from.left}px, ${from.top}px) scale(1)`;
    const end = `translate(${to.left}px, ${to.top}px) scale(${scale})`;
    const duration = flight.duration ?? DEFAULT_FLIGHT_MS;
    const finish = () => {
      if (disposed || finished) return;
      finished = true;
      try { flight.onArrive?.(); } finally { onDone(); }
    };
    const cancelAnimations = () => {
      disposed = true;
      animations.forEach((animation) => {
        animation.removeEventListener("finish", finish);
        animation.cancel();
      });
    };
    // Reduced motion keeps the cue without the travel: a brief pulse at the
    // destination instead of a flying card.
    if (reduced) {
      faces.style.transform = flight.showBack && !flight.flip ? "rotateY(180deg)" : "none";
      const pulse = element.animate([{ transform: end, opacity: 0 }, { transform: end, opacity: .95, offset: .4 }, { transform: end, opacity: 0 }], { duration: REDUCED_FLIGHT_MS, delay: flight.delay ?? 0, easing: "ease-out", fill: "both" });
      animations.push(pulse);
      pulse.addEventListener("finish", finish, { once: true });
      return cancelAnimations;
    }
    const frames: Keyframe[] = flight.via
      ? [
          { transform: start, offset: 0 },
          { transform: `translate(${from.left + flight.via.dx}px, ${from.top + flight.via.dy}px) scale(${1 + (scale - 1) * .35})`, offset: .38 },
          { transform: end, offset: 1 }
        ]
      : [{ transform: start }, { transform: end }];
    const move = element.animate(frames, { duration, delay: flight.delay ?? 0, easing: "cubic-bezier(.3,.7,.25,1)", fill: "both" });
    animations.push(move);
    // Flights stay screen-flat. Applying the board's rotateX to the card face
    // visually compressed its height and made a mathematically 5:7 box look
    // wide again. The source/target piles themselves retain their board tilt.
    if (flight.flip) {
      animations.push(faces.animate([
        { transform: "rotateY(180deg)", offset: 0 },
        { transform: "rotateY(180deg)", offset: flight.flip.start },
        { transform: "rotateY(0deg)", offset: flight.flip.end },
        { transform: "rotateY(0deg)", offset: 1 }
      ], { duration, delay: flight.delay ?? 0, easing: "linear", fill: "both" }));
    } else {
      faces.style.transform = `rotateY(${flight.showBack ? 180 : 0}deg)`;
    }
    move.addEventListener("finish", finish, { once: true });
    return cancelAnimations;
  }, [flight, reduced]);
  const flightWidth = Math.min(flight.from.width, flight.from.height * 5 / 7);
  return <div className="fx-flight" ref={outer} style={{ width: flightWidth, height: flightWidth * 7 / 5 }}>
    <div className="fx-flight-inner" ref={inner}>
      <img className="fx-face" src={flight.face} alt="" draggable={false} />
      <img className="fx-face fx-back" src={CARD_BACK} alt="" draggable={false} />
    </div>
  </div>;
}

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

// Shared timing so the game view's timeline and the design route preview stay
// in lockstep with the CSS keyframes in animations.css.
export const DEAL_TIMING = { drop: GAME_START_TIMING_MS.deckDrop, shuffle: GAME_START_TIMING_MS.deckShuffle };
