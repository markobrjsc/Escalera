import type { LobbyVoice } from "../../lib/types.js";

export function VoiceStatus({ voice, variant }: { voice: LobbyVoice; variant: "lobby" | "game" }) {
  return <aside className={`voice-status voice-status-${voice.status} voice-status-${variant} ${voice.selfMuted ? "is-self-muted" : ""}`} aria-label="Voice-Chat">
    <span className="voice-connection" role="status" aria-live="polite"><span aria-hidden="true">●</span><strong>{voice.status === "connected" ? "Voice verbunden" : voice.status === "requesting" ? "Voice verbindet …" : voice.status === "listen-only" ? "Voice: nur hören" : voice.status === "unsupported" ? "Voice nicht verfügbar" : "Voice getrennt"}</strong></span>
    <button type="button" className="voice-self-mute" data-audio="silent" disabled={!voice.canSelfMute} aria-pressed={voice.selfMuted} aria-label={voice.selfMuted ? "Eigenes Mikrofon wieder einschalten" : "Eigenes Mikrofon stummschalten"} title={!voice.canSelfMute ? "Mikrofon ist nicht verfügbar" : voice.selfMuted ? "Mikrofon einschalten" : "Mikrofon stummschalten"} onClick={voice.toggleSelfMuted}><span aria-hidden="true">{voice.selfMuted ? "◉̸" : "◉"}</span><strong>{voice.selfMuted ? "Mikro aus" : "Mikro an"}</strong></button>
    {voice.notice && <small>{voice.notice}</small>}
  </aside>;
}
