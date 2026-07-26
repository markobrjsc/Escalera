import { phaseRequirement } from "../../../../phasePresentation.js";

// The round / phase indicator with the current phase's laying requirement.
export function PhaseHud({ round, phase, phaseLaid }: { round: number; phase: number; phaseLaid: boolean }) {
  return <section className="phase-hud"><span className="hud-kicker">Runde {round}</span><strong>Phase {phase} / 7</strong><span className="phase-requirement">Ablegen: {phaseRequirement(phase)}</span><span>{phaseLaid ? "Phase ausgelegt" : "Phase offen"}</span></section>;
}
