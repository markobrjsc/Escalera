import { useEffect, useRef, useState } from "react";
import type { Card } from "@escalera/game-rules";
import { CARD_BACK, PileStack } from "./cards.js";
import { BOARD_TILT, DealStage, DEAL_TIMING, FlightLayer, usePrefersReducedMotion } from "./fx.js";
import type { FlightSpec, Rect } from "./fx.js";

/* Design-Route (#51): erreichbar über /design/piles oder #/design/piles, ohne
   Login. Ein Feld mit exakt den Klassen und der 3D-Neigung des echten
   Gameboards, damit Zieh- und Ablagestapel isoliert gestylt werden können —
   PileStack ist dieselbe Komponente, die auch das Gamefield rendert. Die
   Regler spielen Füllstände und das Ablegen/Ziehen durch; die Deal-Bühne
   (Deck-Intro + Riffle-Shuffle aus #50) lässt sich hier isoliert abspielen. */

const DEMO_TOPS: Card[] = [
  { id: "demo-1", kind: "standard", rank: "7", suit: "hearts" },
  { id: "demo-2", kind: "standard", rank: "K", suit: "spades" },
  { id: "demo-3", kind: "standard", rank: "A", suit: "diamonds" },
  { id: "demo-4", kind: "standard", rank: "10", suit: "clubs" },
  { id: "demo-5", kind: "joker" },
  { id: "demo-6", kind: "standard", rank: "3", suit: "clubs" },
  { id: "demo-7", kind: "standard", rank: "Q", suit: "hearts" },
  { id: "demo-8", kind: "standard", rank: "9", suit: "diamonds" }
] as Card[];

export function PileDesignView() {
  const [drawCount, setDrawCount] = useState(86);
  const [discardCount, setDiscardCount] = useState(7);
  const [stage, setStage] = useState<"drop" | "shuffle" | null>(null);
  const [staticCue, setStaticCue] = useState(false);
  const [stageRect, setStageRect] = useState<Rect | null>(null);
  const [flights, setFlights] = useState<FlightSpec[]>([]);
  const drawPile = useRef<HTMLButtonElement>(null);
  const discardPile = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  const reduced = usePrefersReducedMotion();
  const top = discardCount > 0 ? DEMO_TOPS[(discardCount - 1) % DEMO_TOPS.length] : null;
  const previewing = !!stage || staticCue || flights.length > 0;

  useEffect(() => () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  const schedule = (callback: () => void, delay: number) => {
    const timer = window.setTimeout(() => {
      timers.current = timers.current.filter((entry) => entry !== timer);
      callback();
    }, delay);
    timers.current.push(timer);
  };

  const setPreset = (draw: number, discard: number) => {
    setDrawCount(draw);
    setDiscardCount(discard);
  };

  const playIntro = () => {
    if (previewing) return;
    if (reduced) {
      setStaticCue(true);
      schedule(() => setStaticCue(false), 1100);
      return;
    }
    const box = drawPile.current?.getBoundingClientRect(); if (!box) return;
    setStageRect({ left: box.left, top: box.top, width: box.width, height: box.height });
    setStage("drop");
    schedule(() => setStage("shuffle"), DEAL_TIMING.drop);
    schedule(() => setStage(null), DEAL_TIMING.drop + DEAL_TIMING.shuffle);
  };

  const playFlight = () => {
    if (previewing) return;
    const source = drawPile.current?.getBoundingClientRect();
    const target = discardPile.current?.getBoundingClientRect();
    if (!source || !target) return;
    setFlights([{ key: `pile-flight-${Date.now()}`, from: source, to: target, face: CARD_BACK, showBack: true, fromTilt: BOARD_TILT, toTilt: BOARD_TILT, duration: 1400, via: { dx: 0, dy: -90 } }]);
  };

  const previewStatus = staticCue
    ? "Statische Vorschau: Deck sitzt, drei Riffle-Splits, sauber ausgerichtet."
    : stage === "drop"
      ? "Deck fällt auf den Ziehstapel."
      : stage === "shuffle"
        ? "Dreifacher Riffle-Shuffle läuft."
        : "Vorschau bereit.";

  return <main className={`landscape-view game-view pile-design ${stage ? "is-staging" : ""}`}>
    <div className="orientation-notice"><div><div className="rotate-icon">↻</div><h2>Gerät drehen</h2><p className="muted">Das Stapel-Labor ist für Querformat gestaltet.</p></div></div>
    <header className="game-hud">
      <section className="phase-hud pile-design-title"><span className="hud-kicker">Design-Route</span><strong>Stapel-Labor</strong><span>/design/piles</span></section>
    </header>
    <p className="turn-hint">Zieh- und Ablagestapel — identische Komponente wie im Gamefield</p>
    <section className="game-board">
      <div className="pile-station">
        <div className={`pile-slot ${staticCue ? "is-preview-cue" : ""}`}><button ref={drawPile} type="button" className="game-pile draw-pile" aria-label={`Ziehstapel mit ${drawCount} Karten`} onClick={() => setDrawCount((current) => Math.max(0, current - 1))}><PileStack count={drawCount} top={null} kind="draw" /></button></div>
        <span>Ziehstapel <b>[ {drawCount} ]</b></span>
      </div>
      <div className="meld-zone pile-design-workbench">
        <aside className="surface pile-design-panel" aria-labelledby="pile-lab-controls">
          <header className="pile-design-panel-heading">
            <span className="hud-kicker">Live-Komponente</span>
            <h2 id="pile-lab-controls">Labor-Dock</h2>
            <span>Füllstände, Streuung und Deal-Cue direkt auf dem Spieltisch prüfen</span>
          </header>
          <div className="pile-design-sliders">
            <label htmlFor="draw-count"><span>Ziehstapel</span><output>{drawCount}</output><input id="draw-count" type="range" min={0} max={108} value={drawCount} onChange={(event) => setDrawCount(Number(event.target.value))} /></label>
            <label htmlFor="discard-count"><span>Ablage</span><output>{discardCount}</output><input id="discard-count" type="range" min={0} max={60} value={discardCount} onChange={(event) => setDiscardCount(Number(event.target.value))} /></label>
          </div>
          <div className="pile-design-actions">
            <div className="pile-design-action-row" role="group" aria-label="Kartenaktionen">
              <button type="button" aria-label="Karte ablegen" onClick={() => setDiscardCount((current) => Math.min(60, current + 1))}>Ablegen</button>
              <button type="button" aria-label="Karte ziehen" onClick={() => setDrawCount((current) => Math.max(0, current - 1))}>Ziehen</button>
              <button type="button" onClick={() => setPreset(86, 7)}>Standard</button>
            </div>
            <div className="pile-design-preset-row" role="group" aria-label="Vordefinierte Füllstände">
              <button type="button" onClick={() => setPreset(108, 60)}>Voll</button>
              <button type="button" onClick={() => setPreset(54, 30)}>Halb</button>
              <button type="button" aria-label="Fast leer" onClick={() => setPreset(3, 1)}>Fast</button>
              <button type="button" onClick={() => setPreset(0, 0)}>Leer</button>
            </div>
            <button type="button" className="button-primary pile-design-preview" disabled={previewing} aria-describedby="pile-motion-note" onClick={playIntro}>{previewing ? "Vorschau läuft …" : reduced ? "Statischen Deck-Cue zeigen" : "Deck-Intro + Shuffle"}</button>
            <button type="button" className="pile-design-preview" disabled={previewing} onClick={playFlight}>Kartenflug 5:7 prüfen</button>
          </div>
          <p className="muted pile-design-note" id="pile-motion-note">{reduced ? "Bewegung ist reduziert: Die Vorschau zeigt den Ablauf als ruhigen Status-Cue. Volle Bewegung ist über ?motion=full verfügbar." : "Klick auf die Stapel zieht beziehungsweise legt eine Beispielkarte ab."}</p>
          <output className={`pile-preview-status ${previewing ? "is-active" : ""}`} aria-live="polite">{previewStatus}</output>
        </aside>
      </div>
      <div className="pile-station">
        <div className="pile-slot"><button ref={discardPile} type="button" className="game-pile discard-pile" aria-label={top ? `Ablage, oben liegt ${top.kind === "joker" ? "ein Joker" : `${top.rank}`}` : "Ablage ist leer"} onClick={() => setDiscardCount((current) => Math.min(60, current + 1))}><PileStack count={discardCount} top={top} kind="discard" /></button></div>
        <span>Ablage <b>[ {discardCount} ]</b></span>
      </div>
    </section>
    {stage && stageRect && <DealStage rect={stageRect} stage={stage} />}
    <FlightLayer flights={flights} reduced={reduced} onDone={(key) => setFlights((current) => current.filter((flight) => flight.key !== key))} />
  </main>;
}
