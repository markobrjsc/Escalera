import { useState } from "react";
import { api, message } from "../../lib/api.js";
import type { User } from "../../lib/types.js";
import { useAudio } from "../../audio.js";
import { TutorialProgress } from "./TutorialProgress/TutorialProgress.js";

const TUTORIAL_STEPS = [
  { title: "Dein Zug", text: "Ziehe zuerst eine Karte vom Nachzieh- oder Ablagestapel. Beende deinen Zug, indem du genau eine Karte abwirfst." },
  { title: "Sieben Phasen", text: "Lege die geforderte Kombination vollständig aus. Sobald jemand seine Hand leert, steigen alle gemeinsam in die nächste Phase auf." },
  { title: "Karten kaufen", text: "Solange der aktive Spieler die Ablage noch nicht genommen hat, kannst du ihre oberste Karte für eine Münze kaufen." },
  { title: "Das Ziel", text: "Nach Phase 7 endet die Partie. Weniger Strafpunkte bedeuten die bessere Platzierung." }
];

export function TutorialDialog({ user, onUser, onClose }: { user: User; onUser: (user: User) => void; onClose: () => void }) {
  const { play: playAudio } = useAudio();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const finish = async () => {
    setBusy(true); setError("");
    try {
      if (!user.tutorialCompleted) onUser((await api<{ user: User }>("/profile/tutorial/complete", { method: "POST", body: "{}" })).user);
      playAudio("success");
      onClose();
    } catch (reason) { setError(message(reason)); playAudio("error"); } finally { setBusy(false); }
  };
  const current = TUTORIAL_STEPS[step];
  return <div className="dialog-backdrop tutorial-backdrop"><section className="surface dialog tutorial-dialog"><p className="overline">Kurzanleitung · {step + 1}/{TUTORIAL_STEPS.length}</p><div className="tutorial-suits" aria-hidden="true">♠ <span>♥</span> ♣ <span>♦</span></div><h2>{current.title}</h2><p>{current.text}</p><TutorialProgress count={TUTORIAL_STEPS.length} step={step} />{error && <p className="error" role="alert">{error}</p>}<div className="tutorial-actions"><button className="button-quiet" disabled={busy} onClick={() => void finish()}>Überspringen</button>{step > 0 && <button disabled={busy} onClick={() => setStep(step - 1)}>Zurück</button>}<button className="button-primary" disabled={busy} onClick={() => step === TUTORIAL_STEPS.length - 1 ? void finish() : setStep(step + 1)}>{step === TUTORIAL_STEPS.length - 1 ? "Losspielen" : "Einloggen"}</button></div></section></div>;
}
