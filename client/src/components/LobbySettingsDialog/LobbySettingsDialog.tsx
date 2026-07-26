import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { api, message } from "../../lib/api.js";
import type { Lobby } from "../../lib/types.js";
import { useAudio } from "../../audio.js";
import { usePrefersReducedMotion } from "../../lib/motion.js";

export function LobbySettingsDialog({ onClose, onCreated, setError, lobby, defaultName }: { onClose: () => void; onCreated?: (code: string) => Promise<void>; setError: (value: string) => void; lobby?: Lobby; defaultName?: string }) {
  const { play: playAudio } = useAudio();
  const initial = lobby?.settings ?? { maxPlayers: 4, jokersPerPlayer: 1, maxTurnSeconds: 60, streetsRequireSameSuit: true, confirmTurnEnd: true };
  const [name, setName] = useState(lobby?.name ?? defaultName ?? "");
  const [phase, setPhase] = useState<"open" | "submitting" | "closing">("open"); const [settings, setSettings] = useState({ ...initial, maxTurnSeconds: initial.maxTurnSeconds ?? 60 });
  const reduced = usePrefersReducedMotion();
  const phaseRef = useRef(phase); phaseRef.current = phase;
  const closeTimer = useRef<number | null>(null);
  const afterClose = useRef<(() => void) | null>(null);
  const closeFinished = useRef(false);
  const finishClose = useCallback(() => {
    if (closeFinished.current) return;
    closeFinished.current = true;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    onClose();
    afterClose.current?.();
  }, [onClose]);
  const close = (after?: () => void) => {
    if (phaseRef.current === "closing") return;
    phaseRef.current = "closing";
    afterClose.current = after ?? null;
    setPhase("closing");
    // animationend is authoritative; this is only a safety net for background
    // tabs and browsers that suppress animations.
    closeTimer.current = window.setTimeout(finishClose, reduced ? 0 : 420);
  };
  useEffect(() => () => { if (closeTimer.current !== null) window.clearTimeout(closeTimer.current); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (phaseRef.current !== "open") return;
    phaseRef.current = "submitting"; setPhase("submitting"); setError("");
    try {
      const { confirmTurnEnd: _confirmTurnEnd, ...lobbySettings } = settings;
      const saved = await api<Lobby>(lobby ? `/lobbies/${lobby.code}/settings` : "/lobbies", { method: "POST", body: JSON.stringify({ ...lobbySettings, name: name.trim() }) });
      playAudio(lobby ? "success" : "lobbyCreate");
      close(() => { if (!lobby) onCreated?.(saved.code).catch((reason) => setError(message(reason))); });
    } catch (reason) {
      phaseRef.current = "open"; setPhase("open"); setError(message(reason));
    }
  };
  const locked = phase !== "open";
  return <div className={`dialog-backdrop ${phase === "closing" ? "is-closing" : ""}`} onAnimationEnd={(event) => { if (phaseRef.current === "closing" && event.target === event.currentTarget) finishClose(); }} role="presentation"><section className="surface dialog" role="dialog" aria-modal="true" aria-labelledby="lobby-settings-title"><div className="dialog-title"><h2 id="lobby-settings-title">{lobby ? "Einstellungen" : "Lobby erstellen"}</h2><button className="button-icon" disabled={locked} onClick={() => close()} aria-label="Schließen">×</button></div><hr className="dialog-divider" /><form onSubmit={submit} className="settings-form"><label>Lobbyname<input disabled={locked} value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} placeholder="Meine Lobby" required /></label><label>Maximale Spieler<select disabled={locked} value={settings.maxPlayers} onChange={(event) => setSettings({ ...settings, maxPlayers: Number(event.target.value) })}>{[2,3,4,5,6].map((value) => <option key={value}>{value}</option>)}</select></label><label>Joker pro Spieler<select disabled={locked} value={settings.jokersPerPlayer} onChange={(event) => setSettings({ ...settings, jokersPerPlayer: Number(event.target.value) })}>{[0,1,2,3,4,5,6].map((value) => <option key={value}>{value}</option>)}</select></label><label>Zeit pro Zug<select disabled={locked} value={settings.maxTurnSeconds} onChange={(event) => setSettings({ ...settings, maxTurnSeconds: Number(event.target.value) })}>{[30,45,60,90,120,180].map((value) => <option key={value} value={value}>{value} Sekunden</option>)}</select></label><label className="toggle"><input disabled={locked} type="checkbox" checked={settings.streetsRequireSameSuit} onChange={(event) => setSettings({ ...settings, streetsRequireSameSuit: event.target.checked })} />Straße gleiches Zeichen (♥ ♥ ♥) </label><label className="toggle"><input disabled={locked} type="checkbox" checked={settings.confirmTurnEnd} onChange={(event) => setSettings({ ...settings, confirmTurnEnd: event.target.checked })} />Ablegen bestätigen</label><hr className="dialog-divider" /><button className="button-primary" disabled={locked}>{phase === "submitting" ? "Speichere …" : lobby ? "Speichern" : "Lobby erstellen"}</button></form></section></div>;
}
