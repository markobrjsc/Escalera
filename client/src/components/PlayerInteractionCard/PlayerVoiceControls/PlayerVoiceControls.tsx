import type { ParticipantAudio } from "../../../voiceChat.js";

// Volume slider + mute for a single remote player, shown inside the player
// interaction card. Only rendered when that player has an audio channel.
export function PlayerVoiceControls({ username, audio, onVolume, onMute }: { username: string; audio: ParticipantAudio; onVolume: (volume: number) => void; onMute: () => void }) {
  return <section className={`player-voice-controls ${audio.muted ? "is-muted" : ""}`} aria-label={`Voice-Einstellungen für ${username}`}>
    <label htmlFor="player-volume"><span>Lautstärke</span><output>{Math.round(audio.volume * 100)} %</output></label>
    <input id="player-volume" type="range" min="0" max="100" step="1" value={Math.round(audio.volume * 100)} aria-label={`Lautstärke von ${username}`} onChange={(event) => onVolume(Number(event.target.value) / 100)} />
    <button type="button" className={`audio-mute ${audio.muted ? "is-active" : ""}`} aria-pressed={audio.muted} onClick={onMute}>{audio.muted ? "Stummschaltung aufheben" : "Spieler stummschalten"}</button>
  </section>;
}
