import { useCallback, useEffect, useRef, useState } from "react";
import { api, message } from "../../lib/api.js";
import type { Lobby, User } from "../../lib/types.js";
import { useAudio } from "../../audio.js";
import { Orientation } from "../Orientation/Orientation.js";
import { AppHeader } from "../AppHeader/AppHeader.js";
import { Connection } from "../Connection/Connection.js";
import { LobbyToolbar } from "./LobbyToolbar/LobbyToolbar.js";
import { LobbyBrowser } from "./LobbyBrowser/LobbyBrowser.js";
import { LobbySettingsDialog } from "../LobbySettingsDialog/LobbySettingsDialog.js";

export function LobbyListView({ user, connected, revision, error, setError, onLobby, onLogout, onProfile, initialLobbies = [], autoRefresh = true }: { user: User; connected: boolean; revision: number; error: string; setError: (value: string) => void; onLobby: (code: string) => Promise<void>; onLogout: () => Promise<void>; onProfile: () => void; initialLobbies?: Lobby[]; autoRefresh?: boolean }) {
  const { play: playAudio } = useAudio();
  const [lobbies, setLobbies] = useState<Lobby[]>(initialLobbies); const [search, setSearch] = useState(""); const [dialog, setDialog] = useState(false); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(!autoRefresh);
  const searchRef = useRef(search); searchRef.current = search;
  const refresh = useCallback(async (query: string) => {
    try { setLobbies(await api<Lobby[]>(`/lobbies?search=${encodeURIComponent(query)}`)); }
    catch (reason) { setError(message(reason)); }
    finally { setLoaded(true); }
  }, [setError]);
  useEffect(() => {
    if (!autoRefresh) return;
    void refresh("");
    const timer = window.setInterval(() => void refresh(searchRef.current), 10_000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refresh]);
  useEffect(() => { if (autoRefresh && revision > 0) void refresh(searchRef.current); }, [autoRefresh, revision, refresh]);
  const join = async (code: string) => { setBusy(true); setError(""); try { await api(`/lobbies/${code}/join`, { method: "POST", body: "{}" }); playAudio("lobbyJoin"); await onLobby(code); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } };
  return <main className="portrait-view lobby-list-view">
    <Orientation portrait />
    <AppHeader user={user} leftLabel="Abmelden" leftAudio="close" onLeft={() => void onLogout()} onProfile={onProfile} profileAudio="open" />
    <section className="lobby-list-content">
      <div className="welcome-row"><h2 className="welcome">Willkommen, {user.username}</h2><Connection connected={connected} /></div>
      <hr className="lobby-divider" />
      <LobbyToolbar search={search} setSearch={setSearch} onSearch={() => void refresh(search)} onCreate={() => setDialog(true)} />
      {error && <p className="error">{error}</p>}
      <LobbyBrowser lobbies={lobbies} loaded={loaded} busy={busy} onJoin={(code) => void join(code)} />
    </section>
    {dialog && <LobbySettingsDialog defaultName={`${user.username}'s Lobby`} onClose={() => setDialog(false)} onCreated={onLobby} setError={setError} />}
  </main>;
}
