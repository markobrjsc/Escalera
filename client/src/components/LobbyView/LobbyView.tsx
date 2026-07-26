import { useEffect, useRef, useState } from "react";
import { api, message } from "../../lib/api.js";
import type { Lobby, LobbyVoice, PublicUser } from "../../lib/types.js";
import { useAudio } from "../../audio.js";
import { Orientation } from "../Orientation/Orientation.js";
import { AppHeader } from "../AppHeader/AppHeader.js";
import { VoiceStatus } from "../VoiceStatus/VoiceStatus.js";
import { SettingBadges } from "./SettingBadges/SettingBadges.js";
import { MembersPanel } from "./MembersPanel/MembersPanel.js";
import { LobbySettingsDialog } from "../LobbySettingsDialog/LobbySettingsDialog.js";

export function LobbyView({ user, lobby, connected, voice, error, setError, onLeave, onProfile }: { user: PublicUser; lobby: Lobby; connected: boolean; voice: LobbyVoice; error: string; setError: (value: string) => void; onLeave: () => Promise<boolean>; onProfile: (userId: string) => void }) {
  const { play: playAudio } = useAudio();
  const [editing, setEditing] = useState(false);
  const self = lobby.players.find((player) => player.user.id === user.id); const isHost = lobby.host.id === user.id;
  const allReady = lobby.players.length >= 2 && lobby.players.every((player) => player.ready);
  const emptySeats = Array.from({ length: Math.max(0, lobby.settings.maxPlayers - lobby.players.length) });
  const previousMembers = useRef(lobby.players);
  useEffect(() => {
    const previous = previousMembers.current;
    for (const player of lobby.players) {
      const before = previous.find((entry) => entry.user.id === player.user.id);
      if (!before && player.user.id !== user.id) playAudio("playerJoin");
      else if (before && before.ready !== player.ready && player.user.id !== user.id) playAudio(player.ready ? "ready" : "unready");
    }
    previousMembers.current = lobby.players;
  }, [lobby.players, playAudio, user.id]);
  const action = async (path: string) => { setError(""); try { await api(`/lobbies/${lobby.code}/${path}`, { method: "POST", body: "{}" }); playAudio(path === "ready" ? "ready" : "unready"); } catch (reason) { setError(message(reason)); } };
  return <main className="portrait-view lobby-view">
    <Orientation portrait />
    <AppHeader user={user} leftLabel="Lobby verlassen" onLeft={() => void onLeave()} onProfile={() => onProfile(user.id)} />
    <section className="lobby-layout">
      <h2 className="lobby-name">{lobby.name}</h2>
      <VoiceStatus voice={voice} variant="lobby" />
      <div className="lobby-settings-row" data-tutorial-target="lobby-settings"><SettingBadges settings={lobby.settings} />{isHost && <button className="button-icon lobby-settings-button" aria-label="Lobby-Einstellungen" onClick={() => setEditing(true)}>⚙</button>}</div>
      <MembersPanel players={lobby.players} maxPlayers={lobby.settings.maxPlayers} hostId={lobby.host.id} allReady={allReady} emptySeats={emptySeats} onProfile={onProfile} />
      {error && <p className="error">{error}</p>}
      <footer className="lobby-actions" data-tutorial-target="lobby-ready"><button onClick={() => void action(self?.ready ? "not-ready" : "ready")}>{self?.ready ? "Nicht bereit" : "Bereit"}</button></footer>
    </section>
    {editing && <LobbySettingsDialog lobby={lobby} onClose={() => setEditing(false)} setError={setError} />}
  </main>;
}
