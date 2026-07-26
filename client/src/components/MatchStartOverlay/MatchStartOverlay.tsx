import { useLayoutEffect } from "react";
import { CARD_BACK } from "../../lib/cards.js";

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
