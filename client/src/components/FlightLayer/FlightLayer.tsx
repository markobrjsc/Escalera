import { useLayoutEffect, useRef } from "react";
import { CARD_BACK } from "../../lib/cards.js";
import { DEFAULT_FLIGHT_MS, REDUCED_FLIGHT_MS } from "../../lib/motion.js";
import type { FlightSpec, Rect } from "../../lib/motion.js";

/* -------------------------------------------------------------- Card flights
   One overlay element per travelling card. The outer node translates/scales
   from the source rect to the target rect (morphing pile size ↔ hand size on
   the way); the inner node is double-faced and can flip back→front inside a
   window of the flight. Rects are screen-space, so the board's 3D tilt never
   disturbs a flight. */
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
