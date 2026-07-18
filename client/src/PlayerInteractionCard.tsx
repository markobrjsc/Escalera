import { useState, type ReactNode } from "react";
import type { ParticipantAudio } from "./voiceChat.js";

type PlayerInteractionCardProps = {
  username: string;
  avatar: ReactNode;
  audio?: ParticipantAudio;
  canKick: boolean;
  onProfile: () => void;
  onVolume: (volume: number) => void;
  onMute: () => void;
  onKick: () => Promise<void>;
  onClose: () => void;
};

export function PlayerInteractionCard({ username, avatar, audio, canKick, onProfile, onVolume, onMute, onKick, onClose }: PlayerInteractionCardProps) {
  const [confirmKick, setConfirmKick] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const kick = async () => {
    setBusy(true);
    setError("");
    try { await onKick(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Spieler konnte nicht gekickt werden."); setBusy(false); }
  };

  return <div className="dialog-backdrop player-card-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="surface player-interaction-card" role="dialog" aria-modal="true" aria-labelledby="player-card-title">
      <div className="dialog-title">
        <div className="player-card-identity">{avatar}<div><p className="overline">Spieler</p><h2 id="player-card-title">{username}</h2></div></div>
        <button className="button-icon" aria-label="Spieler-Menü schließen" onClick={onClose}>×</button>
      </div>
      <button className="button player-profile-action" onClick={onProfile}>Profil aufrufen</button>
      {audio && <section className={`player-voice-controls ${audio.muted ? "is-muted" : ""}`} aria-label={`Voice-Einstellungen für ${username}`}>
        <label htmlFor="player-volume"><span>Lautstärke</span><output>{Math.round(audio.volume * 100)} %</output></label>
        <input id="player-volume" type="range" min="0" max="100" step="1" value={Math.round(audio.volume * 100)} aria-label={`Lautstärke von ${username}`} onChange={(event) => onVolume(Number(event.target.value) / 100)} />
        <button type="button" className={`audio-mute ${audio.muted ? "is-active" : ""}`} aria-pressed={audio.muted} onClick={onMute}>{audio.muted ? "Stummschaltung aufheben" : "Spieler stummschalten"}</button>
      </section>}
      {canKick && <button type="button" className="button-danger player-kick-action" onClick={() => setConfirmKick(true)}>Aus Lobby kicken</button>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    {confirmKick && <ConfirmationDialog
      title="Spieler kicken?"
      message={`Möchtest du ${username} wirklich kicken?`}
      busy={busy}
      onConfirm={() => void kick()}
      onCancel={() => setConfirmKick(false)}
    />}
  </div>;
}

export function ConfirmationDialog({ title, message, busy, onConfirm, onCancel }: { title: string; message: string; busy: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <div className="dialog-backdrop confirmation-backdrop" role="presentation">
    <section className="surface confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-message">
      <h2 id="confirmation-title">{title}</h2>
      <p id="confirmation-message">{message}</p>
      <div className="confirmation-actions">
        <button type="button" disabled={busy} onClick={onCancel}>Nein</button>
        <button type="button" disabled={busy} className="button-danger" onClick={onConfirm}>{busy ? "Wird entfernt …" : "Ja, kicken"}</button>
      </div>
    </section>
  </div>;
}
