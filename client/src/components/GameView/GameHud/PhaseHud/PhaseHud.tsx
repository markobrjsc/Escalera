import { useEffect, useState } from "react";
import type { Suit } from "@escalera/game-rules";
import { reducedMotionActive } from "../../../../lib/motion.js";
import { PHASE_PREVIEW_INTERVAL_MS, phasePreview, phaseRequirement, type PhasePreviewCard } from "../../../../phasePresentation.js";

const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠"
};

function usePreviewStep(phase: number, fixedStep?: number) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    setStep(0);
    if (fixedStep !== undefined || typeof window === "undefined") return;
    const query = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    let timer: number | undefined;
    const sync = () => {
      if (timer !== undefined) window.clearInterval(timer);
      timer = undefined;
      if (query && reducedMotionActive()) return;
      timer = window.setInterval(() => setStep((current) => current + 1), PHASE_PREVIEW_INTERVAL_MS);
    };
    sync();
    query?.addEventListener("change", sync);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      query?.removeEventListener("change", sync);
    };
  }, [fixedStep, phase]);
  return fixedStep ?? step;
}

function PreviewCard({ card, index, step }: { card: PhasePreviewCard; index: number; step: number }) {
  return <span
    className={`phase-preview-card is-${card.suit}`}
    data-rank={card.rank}
    data-suit={card.suit}
    key={`${step}-${card.rank}-${card.suit}-${index}`}
  >
    <span>{card.rank}</span>
    <span>{SUIT_SYMBOLS[card.suit]}</span>
  </span>;
}

// Absolute by design: the phase reminder must never resize the gamefield.
export function PhaseHud({ round, phase, phaseLaid, previewStep }: { round: number; phase: number; phaseLaid: boolean; previewStep?: number }) {
  const step = usePreviewStep(phase, previewStep);
  const preview = phasePreview(phase, step);
  const state = phaseLaid ? "Phase ausgelegt" : "Phase offen";
  return <section className={`phase-hud ${phaseLaid ? "is-laid" : "is-open"}`} aria-label={`Runde ${round} von 7. ${phaseRequirement(phase)}. ${state}.`}>
    <strong className="phase-hud-round">Runde {round}/7</strong>
    <span className="phase-hud-preview" aria-hidden="true">
      {preview.kind === "groups" && <span className="phase-group-count">{preview.groups}×</span>}
      {preview.kind === "unknown"
        ? <span className="phase-preview-fallback">?</span>
        : <span className={`phase-preview-cards is-${preview.kind}`}>
          {preview.cards.map((card, index) => <PreviewCard card={card} index={index} step={step} key={`${card.rank}-${card.suit}-${index}`} />)}
        </span>}
    </span>
  </section>;
}
