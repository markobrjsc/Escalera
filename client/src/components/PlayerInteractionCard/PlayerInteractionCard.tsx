import { useState, type ReactNode } from "react";
import type { ParticipantAudio } from "../../voiceChat.js";
import { ConfirmationDialog } from "../ConfirmationDialog/ConfirmationDialog.js";
import { PlayerVoiceControls } from "./PlayerVoiceControls/PlayerVoiceControls.js";

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
      {audio && <PlayerVoiceControls username={username} audio={audio} onVolume={onVolume} onMute={onMute} />}
      {canKick && <button type="button" className="button-danger player-kick-action" onClick={() => setConfirmKick(true)}>Aus Lobby kicken</button>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    {confirmKick && <ConfirmationDialog
      title="Spieler kicken?"
      message={`Möchtest du ${username} wirklich kicken?`}
      busy={busy}
      confirmLabel="Ja, kicken"
      busyLabel="Wird entfernt …"
      onConfirm={() => void kick()}
      onCancel={() => setConfirmKick(false)}
    />}
  </div>;
}
