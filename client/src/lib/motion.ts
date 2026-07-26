// Motion preferences, timing constants and flight geometry shared by the
// animation components (SlideStage, FlightLayer, DealStage, MatchStartOverlay)
// and the game choreography. Extracted from the former fx.tsx (#89).
import { useEffect, useState } from "react";
import { GAME_START_TIMING_MS } from "@escalera/game-rules";

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

// Screen-space rectangle and one travelling overlay card. Rects are screen-space,
// so the board's 3D tilt never disturbs a flight.
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

// Shared timing so the game view's timeline and the design route preview stay
// in lockstep with the CSS keyframes in animations.css.
export const DEAL_TIMING = { drop: GAME_START_TIMING_MS.deckDrop, shuffle: GAME_START_TIMING_MS.deckShuffle };
