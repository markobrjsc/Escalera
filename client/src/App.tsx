import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { api, message, SOCKET_URL } from "./lib/api.js";
import type { AchievementNode, Game, Lobby, ProfileStatistics, User } from "./lib/types.js";
import { MATCH_INTRO_MS, MATCH_INTRO_REDUCED_MS, usePrefersReducedMotion } from "./lib/motion.js";
import { audioSceneForView, useAudio } from "./audio.js";
import type { AudioPreferences } from "./audio.js";
import { useLobbyVoice } from "./voiceChat.js";
import { SlideStage } from "./components/SlideStage/SlideStage.js";
import { MatchStartOverlay } from "./components/MatchStartOverlay/MatchStartOverlay.js";
import { VoiceStatus } from "./components/VoiceStatus/VoiceStatus.js";
import { AchievementToasts } from "./components/AchievementToasts/AchievementToasts.js";
import { Avatar } from "./components/Avatar/Avatar.js";
import { AccessView } from "./components/AccessView/AccessView.js";
import { LobbyListView } from "./components/LobbyListView/LobbyListView.js";
import { LobbyView } from "./components/LobbyView/LobbyView.js";
import { GameView } from "./components/GameView/GameView.js";
import { PlayerInteractionCard } from "./components/PlayerInteractionCard/PlayerInteractionCard.js";
import { ProfileDialog } from "./components/ProfileDialog/ProfileDialog.js";
import { TutorialDialog } from "./components/TutorialDialog/TutorialDialog.js";

// The composition root: session, lobby and game state plus the realtime socket.
// It picks the active screen and mounts the shared overlays; every screen and
// widget lives in its own component module under ./components (#89).
export function App() {
  const reduced = usePrefersReducedMotion();
  const { play: playAudio, setScene: setAudioScene, setPreferences: setAudioPreferences } = useAudio();
  const [user, setUser] = useState<User | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [playerCardUserId, setPlayerCardUserId] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [lobbyRevision, setLobbyRevision] = useState(0);
  const [unlocks, setUnlocks] = useState<AchievementNode[]>([]);
  const achievementsSeen = useRef(new Set<string>());
  const lobbyScope = useRef<string | null>(null);
  const acceptedGame = useRef<{ code: string; version: number } | null>(null);
  const connectedOnce = useRef(false);
  const voiceParticipantIds = useMemo(() => lobby?.players.filter((player) => player.connected && player.user.id !== user?.id).map((player) => player.user.id) ?? [], [lobby?.players, user?.id]);
  const voice = useLobbyVoice(socket, lobby?.code ?? null, user?.id ?? null, voiceParticipantIds);

  // HTTP responses and realtime packets share one monotonic gate. Entering a
  // different lobby deliberately starts a fresh version scope; late results
  // from the previous lobby can no longer restore its game on screen.
  const enterLobbyScope = useCallback((code: string) => {
    const normalized = code.toUpperCase();
    if (lobbyScope.current !== normalized) {
      lobbyScope.current = normalized;
      acceptedGame.current = null;
      setGame(null);
    }
    return normalized;
  }, []);
  const resetLobbyScope = useCallback(() => {
    lobbyScope.current = null;
    acceptedGame.current = null;
    setGame(null);
  }, []);
  const acceptGame = useCallback((code: string, next: Game) => {
    const normalized = code.toUpperCase();
    if (lobbyScope.current !== normalized) return;
    const accepted = acceptedGame.current;
    if (accepted?.code === normalized && next.version < accepted.version) return;
    acceptedGame.current = { code: normalized, version: next.version };
    setGame(next);
  }, []);

  // Every accepted game version can advance an achievement. Announce each
  // freshly unlocked node once, including purchases, moves and streets.
  useEffect(() => {
    if (!user || !lobby || !game) return;
    api<ProfileStatistics>(`/profile/users/${user.id}`)
      .then((profile) => {
        const fresh = profile.tree.flatMap((branch) => branch.nodes).filter((node) => node.unlockedAt !== null && Date.now() - Date.parse(node.unlockedAt) < 30_000 && !achievementsSeen.current.has(node.id));
        fresh.forEach((node) => achievementsSeen.current.add(node.id));
        if (fresh.length) {
          setUnlocks((current) => [...current.filter((node) => !fresh.some((next) => next.id === node.id)), ...fresh]);
          playAudio("achievement", { dedupeKey: fresh.map((node) => node.id).join("|") });
        }
      })
      .catch(() => undefined);
  }, [game?.version, lobby?.code, user?.id]);

  useEffect(() => {
    api<{ user: User }>("/auth/me").then(async (result) => {
      setUser(result.user);
      const current = await api<Lobby | null>("/lobbies/current");
      if (!current) return;
      enterLobbyScope(current.code);
      setLobby(current);
      if (current.status !== "OPEN") acceptGame(current.code, await api<Game>(`/lobbies/${current.code}/game`));
    }).catch(() => undefined).finally(() => setLoading(false));
  }, [acceptGame, enterLobbyScope]);
  useEffect(() => {
    if (!user) return;
    void api<AudioPreferences>("/profile/audio").then(setAudioPreferences).catch(() => undefined);
  }, [setAudioPreferences, user?.id]);
  useEffect(() => {
    if (!user) return;
    const live = io(`${SOCKET_URL}/realtime`, { withCredentials: true, transports: ["websocket"] });
    live.on("realtime:connected", () => { if (connectedOnce.current) playAudio("connection"); connectedOnce.current = true; setConnected(true); setSocket(live); }); live.on("disconnect", () => { if (connectedOnce.current) playAudio("disconnect"); setConnected(false); setSocket(null); });
    live.on("lobby:update", (value: Lobby) => { if (lobbyScope.current === value.code.toUpperCase()) setLobby(value); });
    live.on("game:update", (value: { code: string; game: Game }) => acceptGame(value.code, value.game));
    live.on("lobbies:update", () => setLobbyRevision((value) => value + 1));
    live.on("lobby:deleted", (value: { code?: string }) => { if (value.code?.toUpperCase() !== lobbyScope.current) return; setLobby(null); resetLobbyScope(); setError("Die Lobby wurde wegen Inaktivität geschlossen."); });
    live.on("lobby:kicked", (value: { code?: string }) => { if (value.code?.toUpperCase() !== lobbyScope.current) return; setLobby(null); setPlayerCardUserId(null); resetLobbyScope(); setError("Du wurdest aus der Lobby entfernt."); });
    return () => { live.disconnect(); setSocket(null); setConnected(false); };
  }, [acceptGame, resetLobbyScope, user]);
  useEffect(() => { if (!socket || !lobby?.code) return; socket.emit("lobby:watch", { code: lobby.code }); return () => { socket.emit("lobby:unwatch", { code: lobby.code }); }; }, [socket, lobby?.code]);

  const openLobby = async (code: string) => { const value = await api<Lobby>(`/lobbies/${code}`); enterLobbyScope(value.code); setLobby(value); if (value.status === "ACTIVE") acceptGame(value.code, await api<Game>(`/lobbies/${value.code}/game`)); };
  const leaveLobby = async () => {
    if (!lobby) return false;
    try {
      await api(`/lobbies/${lobby.code}/leave`, { method: "POST", body: "{}" });
      setLobby(null);
      setPlayerCardUserId(null);
      resetLobbyScope();
      playAudio("close");
      return true;
    } catch (reason) { setError(message(reason)); return false; }
  };
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST", body: "{}" });
      setUser(null);
      setLobby(null);
      setPlayerCardUserId(null);
      resetLobbyScope();
      setError("");
      playAudio("close");
    } catch (reason) { setError(message(reason)); }
  };
  const updateUser = (next: User) => {
    setUser(next);
    setLobby((current) => current ? {
      ...current,
      host: current.host.id === next.id ? { ...current.host, avatarKey: next.avatarKey } : current.host,
      players: current.players.map((player) => player.user.id === next.id ? { ...player, user: next } : player)
    } : current);
  };
  const kickPlayer = async (targetUserId: string) => {
    if (!lobby) return;
    const updated = await api<Lobby>(`/lobbies/${lobby.code}/players/${targetUserId}/kick`, { method: "POST", body: "{}" });
    setLobby(updated);
    setPlayerCardUserId(null);
    playAudio("success");
  };

  // One key per screen drives the slide transitions (#50). The match intro is
  // intentionally derived from *committed* views after bootstrap: deriving it
  // while /auth/me hydrates would replay "Alle Spieler bereit" on every reload
  // of an already active game.
  const viewKey = !user ? "access" : game && lobby && lobby.status !== "OPEN" ? "game" : lobby ? "lobby" : "list";
  const previousAudioView = useRef<string | null>(null);
  useEffect(() => {
    setAudioScene(audioSceneForView(viewKey));
    if (previousAudioView.current && previousAudioView.current !== viewKey) playAudio("scene", { dedupeKey: `${previousAudioView.current}-${viewKey}-${Date.now()}` });
    previousAudioView.current = viewKey;
  }, [playAudio, setAudioScene, viewKey]);
  useEffect(() => { if (error) playAudio("error"); }, [error, playAudio]);
  const committedView = useRef<string | null>(null);
  const [matchIntro, setMatchIntro] = useState(false);
  useLayoutEffect(() => {
    if (loading) return;
    const previous = committedView.current;
    committedView.current = viewKey;
    if (previous !== "lobby" || viewKey !== "game") return;
    setProfileUserId(null);
    setPlayerCardUserId(null);
    setTutorialOpen(false);
    setMatchIntro(true);
    playAudio("gameStart", { dedupeKey: `${lobby?.code ?? "game"}-${game?.state.round ?? 1}` });
  }, [game?.state.round, loading, lobby?.code, playAudio, viewKey]);
  useEffect(() => {
    if (!matchIntro) return;
    const timer = window.setTimeout(() => setMatchIntro(false), reduced ? MATCH_INTRO_REDUCED_MS : MATCH_INTRO_MS);
    return () => window.clearTimeout(timer);
  }, [matchIntro, reduced]);
  // The login card only sweeps in on the very first screen of a session, not
  // when a later logout slides back to it.
  const [booted, setBooted] = useState(false);
  useEffect(() => { if (viewKey !== "access") setBooted(true); }, [viewKey]);

  if (loading) return <main className="portrait-view centered"><p className="brand">Escalera</p></main>;
  const selectedPlayer = lobby?.players.find((player) => player.user.id === playerCardUserId)?.user ?? null;
  const view = !user
    ? <AccessView intro={!booted} error={error} setError={setError} onAccess={(next, created) => { setUser(next); if (created) setTutorialOpen(true); }} />
    : game && lobby && lobby.status !== "OPEN"
      ? <GameView user={user} lobby={lobby} game={game} connected={connected} introHold={matchIntro} onGame={(next) => acceptGame(lobby.code, next)} onLeave={leaveLobby} onProfile={setPlayerCardUserId} onTutorial={() => setTutorialOpen(true)} />
      : lobby
        ? <LobbyView user={user} lobby={lobby} connected={connected} voice={voice} error={error} setError={setError} onLeave={leaveLobby} onProfile={setPlayerCardUserId} />
        : <LobbyListView user={user} connected={connected} revision={lobbyRevision} error={error} setError={setError} onLobby={openLobby} onLogout={logout} onProfile={() => setProfileUserId(user.id)} />;
  return <>
    <SlideStage viewKey={viewKey}>{view}</SlideStage>
    {lobby && game && lobby.status !== "OPEN" && <VoiceStatus voice={voice} variant="game" />}
    {matchIntro && game && <MatchStartOverlay round={game.state.round} phase={game.state.phase} />}
    {user && lobby && selectedPlayer && <PlayerInteractionCard
      username={selectedPlayer.username}
      avatar={<Avatar user={selectedPlayer} large />}
      audio={selectedPlayer.id === user.id ? undefined : voice.participant(selectedPlayer.id)}
      canKick={lobby.host.id === user.id && selectedPlayer.id !== user.id}
      onProfile={() => { setPlayerCardUserId(null); setProfileUserId(selectedPlayer.id); }}
      onVolume={(volume) => voice.setVolume(selectedPlayer.id, volume)}
      onMute={() => voice.toggleMuted(selectedPlayer.id)}
      onKick={() => kickPlayer(selectedPlayer.id)}
      onClose={() => setPlayerCardUserId(null)}
    />}
    {user && profileUserId && <ProfileDialog viewer={user} userId={profileUserId} onUser={updateUser} onTutorial={() => { setProfileUserId(null); setTutorialOpen(true); }} onClose={() => setProfileUserId(null)} />}
    {user && tutorialOpen && <TutorialDialog user={user} onUser={updateUser} onClose={() => setTutorialOpen(false)} />}
    <AchievementToasts unlocks={unlocks} onDismiss={(id) => setUnlocks((current) => current.filter((node) => node.id !== id))} />
  </>;
}
