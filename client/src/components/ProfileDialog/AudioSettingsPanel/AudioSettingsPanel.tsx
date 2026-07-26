import type { AudioPreferences } from "../../../audio.js";

// Mute toggle + music/effects level sliders. Shown only for the viewer's own
// profile. The ProfileDialog persists the changes (debounced).
export function AudioSettingsPanel({ preferences, onToggleMute, onLevel }: { preferences: AudioPreferences; onToggleMute: () => void; onLevel: (key: "music" | "effects", value: number) => void }) {
  const audioLevels: Array<{ key: "music" | "effects"; label: string }> = [
    { key: "music", label: "Musik" }, { key: "effects", label: "Soundeffekte" }
  ];
  return <section className={`profile-audio ${preferences.muted ? "is-muted" : ""}`} aria-labelledby="audio-settings-title">
    <div className="profile-audio-title"><div><p className="overline">Sound & Musik</p><h3 id="audio-settings-title">Audio-Mix</h3></div><button type="button" className={`audio-mute ${preferences.muted ? "is-active" : ""}`} data-audio="silent" aria-pressed={preferences.muted} onClick={onToggleMute}>{preferences.muted ? "Ton einschalten" : "Stummschalten"}</button></div>
    <div className="audio-levels">{audioLevels.map(({ key, label }) => <label className="audio-level" key={key}><span>{label}<output>{preferences[key]}%</output></span><input data-audio="silent" type="range" min="0" max="100" step="1" value={preferences[key]} onInput={(event) => onLevel(key, Number(event.currentTarget.value))} aria-label={`${label}-Lautstärke`} /></label>)}</div>
  </section>;
}
