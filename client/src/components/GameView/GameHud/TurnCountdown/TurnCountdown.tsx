import { useEffect, useState } from "react";
import { useAudio } from "../../../../audio.js";

export function TurnCountdown({ opensAt, deadlineAt, finished }: { opensAt: string | null; deadlineAt: string | null; finished: boolean }) {
  const { play: playAudio } = useAudio();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, []);
  const preparing = opensAt ? Math.max(0, Math.ceil((Date.parse(opensAt) - now) / 1000)) : 0;
  const remaining = !finished && preparing === 0 && deadlineAt ? Math.max(0, Math.ceil((Date.parse(deadlineAt) - now) / 1000)) : null;
  useEffect(() => {
    if (remaining === 10 || (remaining !== null && remaining <= 5 && remaining > 0)) playAudio("warning", { dedupeKey: `${deadlineAt}-${remaining}`, intensity: remaining === 10 ? .82 : .55 });
  }, [deadlineAt, playAudio, remaining]);
  if (finished) return null;
  if (preparing > 0) return <span className="turn-countdown" aria-label={`Spielstart in ${preparing} Sekunden`}>…</span>;
  return <span className={`turn-countdown ${remaining !== null && remaining <= 10 ? "is-urgent" : ""}`} aria-label={remaining === null ? "Keine Zugbegrenzung" : `${remaining} Sekunden verbleibend`}>{remaining === null ? "∞" : `${remaining}s`}</span>;
}
