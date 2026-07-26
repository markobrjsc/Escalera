import type { LobbyVoice } from "../../lib/types.js";

const connectionLabel: Record<LobbyVoice["status"], string> = {
  connected: "Voice verbunden",
  idle: "Voice getrennt",
  "listen-only": "Voice: nur hören",
  requesting: "Voice verbindet …",
  unsupported: "Voice nicht verfügbar"
};

function MicrophoneIcon({ muted }: { muted: boolean }) {
  return <svg className="voice-microphone-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <rect x="5.25" y="1.5" width="5.5" height="8" rx="2.75" />
    <path d="M3.25 7.5a4.75 4.75 0 0 0 9.5 0M8 12.25v2.25M5.75 14.5h4.5" />
    {muted && <path className="voice-microphone-slash" d="M2 2l12 12" />}
  </svg>;
}

export function VoiceStatus({ voice, variant }: { voice: LobbyVoice; variant: "lobby" | "game" }) {
  const isGame = variant === "game";
  const isConnected = voice.status === "connected";
  const unavailableInGame = isGame && !isConnected;
  const disabled = !voice.canSelfMute || unavailableInGame;
  const buttonLabel = unavailableInGame ? "Voice nicht verbunden" : voice.selfMuted ? "Mikro aus" : "Mikro an";
  const accessibleLabel = unavailableInGame
    ? "Voice nicht verbunden. Mikrofonsteuerung nicht verfügbar"
    : voice.selfMuted
      ? "Mikrofon ist aus. Eigenes Mikrofon einschalten"
      : "Mikrofon ist an. Eigenes Mikrofon stummschalten";

  return <aside
    className={`voice-status voice-status-${voice.status} voice-status-${variant} ${voice.selfMuted ? "is-self-muted" : ""}`}
    data-tutorial-target="voice-controls"
    aria-label="Voice-Chat"
    aria-live={isGame ? "polite" : undefined}
    aria-atomic={isGame ? "true" : undefined}
  >
    {!isGame && <span className="voice-connection" role="status" aria-live="polite"><span aria-hidden="true">●</span><strong>{connectionLabel[voice.status]}</strong></span>}
    <button
      type="button"
      className="voice-self-mute"
      data-audio="silent"
      disabled={disabled}
      aria-pressed={isConnected ? voice.selfMuted : undefined}
      aria-label={accessibleLabel}
      title={disabled ? "Mikrofon ist nicht verfügbar" : voice.selfMuted ? "Mikrofon einschalten" : "Mikrofon stummschalten"}
      onClick={voice.toggleSelfMuted}
    >
      <MicrophoneIcon muted={voice.selfMuted || !isConnected} />
      <strong>{buttonLabel}</strong>
    </button>
    {!isGame && voice.notice && <small role="status">{voice.notice}</small>}
  </aside>;
}
