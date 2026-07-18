import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { GAME_START_TIMING_MS, INITIAL_HAND_SIZE, validateGroup, validatePhase, validateStreet } from "@escalera/game-rules";
import type { Card, Phase } from "@escalera/game-rules";
import { CARD_BACK, CardFace, cardAsset, cardLabel, cardSort, PileStack } from "./cards.js";
import { BOARD_TILT, DealStage, DEAL_TIMING, FlightLayer, MatchStartOverlay, MATCH_INTRO_MS, MATCH_INTRO_REDUCED_MS, SlideStage, fitCardRect, usePrefersReducedMotion } from "./fx.js";
import type { FlightSpec, Rect } from "./fx.js";
import { audioCueForGameAction, audioSceneForView, useAudio } from "./audio.js";
import type { AudioPreferences } from "./audio.js";
import { ConfirmationDialog, PlayerInteractionCard } from "./PlayerInteractionCard.js";
import { useLobbyVoice } from "./voiceChat.js";
import { runSingleFlight } from "./singleFlight.js";
import { requiresLeaveConfirmation } from "./leaveConfirmation.js";
import { buildScoreboardRows } from "./scoreboard.js";
import { phaseRequirement } from "./phasePresentation.js";

const API_URL = "/api";
const SOCKET_URL = window.location.origin;

function hasSessionFlag(key: string | null) {
  if (!key) return false;
  try { return sessionStorage.getItem(key) === "1"; } catch { return false; }
}

type User = { id: string; username: string; avatarKey: string | null; tutorialCompleted: boolean };
type Lobby = {
  code: string;
  name: string;
  status: "OPEN" | "ACTIVE" | "CLOSED";
  host: Pick<User, "id" | "username" | "avatarKey">;
  settings: { maxPlayers: number; jokersPerPlayer: number; maxTurnSeconds: number | null; streetsRequireSameSuit: boolean; confirmTurnEnd: boolean };
  players: Array<{ user: User; ready: boolean; connected: boolean }>;
};
type GameMeld = { id: string; ownerId: string; type: "group" | "street"; cards: Card[]; sameSuit: boolean };
type RoundResult = { round: number; phase: number; endedById: string; scores: Array<{ userId: string; penalty: number; totalPenalty: number }> };
type FinalPlacement = { userId: string; rank: number; totalPenalty: number };
type RecentGameAction = { commandId: string; userId: string; type: string; version: number; createdAt: string; metadata?: { source?: "draw" | "discard"; includesDraw?: boolean; includesDiscard?: boolean } };
type AchievementNode = { id: string; label: string; threshold: number; unlocked: boolean; unlockedAt: string | null };
type AchievementBranch = { key: string; title: string; kind: "phase" | "gte"; value: number; nodes: AchievementNode[] };
type ProfileStatistics = { user: Pick<User, "id" | "username" | "avatarKey">; statistics: Record<string, number>; tree: AchievementBranch[] };
type Game = {
  version: number;
  state: {
    status: "ACTIVE" | "FINISHED";
    round: number;
    phase: number;
    activePlayerId: string;
    drawPileCount: number;
    discardTop: Card | null;
    discardPileCount: number;
    discardOffer: { available: boolean; cardId: string } | null;
    turn: { hasDrawn: boolean; canAct: boolean; opensAt: string | null; deadlineAt: string | null };
    melds: GameMeld[];
    roundEndedById: string | null;
    lastRoundResult: RoundResult | null;
    roundResults: RoundResult[];
    placements: FinalPlacement[];
    recentActions: RecentGameAction[];
    players: Array<{ userId: string; handCount: number; coins: number; phaseLaid: boolean; totalPenalty: number; timeouts: number }>;
    ownHand: Card[];
  };
};

async function api<T>(path: string, options: RequestInit = {}) {
  const jsonBody = options.body && !(options.body instanceof FormData);
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", headers: { ...(jsonBody ? { "content-type": "application/json" } : {}), ...options.headers }, ...options });
  if (!response.ok) { const body = await response.json().catch(() => null); throw new ApiError(Array.isArray(body?.message) ? body.message.join(" ") : body?.message ?? "Etwas ist schiefgelaufen.", body); }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

class ApiError extends Error { constructor(message: string, readonly body: unknown) { super(message); } }

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
        ? <LobbyView user={user} lobby={lobby} connected={connected} error={error} setError={setError} onLeave={leaveLobby} onProfile={setPlayerCardUserId} />
        : <LobbyListView user={user} connected={connected} revision={lobbyRevision} error={error} setError={setError} onLobby={openLobby} onLogout={logout} onProfile={() => setProfileUserId(user.id)} />;
  return <>
    <SlideStage viewKey={viewKey}>{view}</SlideStage>
    {lobby && <aside className={`voice-status voice-status-${voice.status} ${game && lobby.status !== "OPEN" ? "voice-status-game" : ""} ${voice.selfMuted ? "is-self-muted" : ""}`} aria-label="Voice-Chat">
      <span className="voice-connection" role="status" aria-live="polite"><span aria-hidden="true">●</span><strong>{voice.status === "connected" ? "Voice verbunden" : voice.status === "requesting" ? "Voice verbindet …" : voice.status === "listen-only" ? "Voice: nur hören" : voice.status === "unsupported" ? "Voice nicht verfügbar" : "Voice getrennt"}</strong></span>
      <button type="button" className="voice-self-mute" data-audio="silent" disabled={!voice.canSelfMute} aria-pressed={voice.selfMuted} aria-label={voice.selfMuted ? "Eigenes Mikrofon wieder einschalten" : "Eigenes Mikrofon stummschalten"} title={!voice.canSelfMute ? "Mikrofon ist nicht verfügbar" : voice.selfMuted ? "Mikrofon einschalten" : "Mikrofon stummschalten"} onClick={voice.toggleSelfMuted}><span aria-hidden="true">{voice.selfMuted ? "◉̸" : "◉"}</span><strong>{voice.selfMuted ? "Mikro aus" : "Mikro an"}</strong></button>
      {voice.notice && <small>{voice.notice}</small>}
    </aside>}
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

// Unlock notifications: each fresh achievement pops top-right and dismisses itself
// after ~8s. Purely presentational — the unlock itself is already persisted.
function AchievementToasts({ unlocks, onDismiss }: { unlocks: AchievementNode[]; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timers = unlocks.map((node) => window.setTimeout(() => onDismiss(node.id), 8000));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [unlocks, onDismiss]);
  if (!unlocks.length) return null;
  return <div className="achievement-toasts" role="status" aria-live="polite">{unlocks.map((node) => <button className="achievement-toast" key={node.id} onClick={() => onDismiss(node.id)}><span className="toast-star" aria-hidden="true">★</span><div><strong>Erfolg freigeschaltet</strong><span>{node.label}</span></div></button>)}</div>;
}

function AccessView({ intro, error, setError, onAccess }: { intro: boolean; error: string; setError: (value: string) => void; onAccess: (user: User, created: boolean) => void }) {
  const { play: playAudio } = useAudio();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const access = async (registration: boolean) => {
    const result = await api<{ user: User; created: boolean }>("/auth/access", { method: "POST", body: JSON.stringify({ username, password, ...(registration ? { passwordConfirmation: confirmation, acceptPasswordLoss: accepted } : {}) }) });
    playAudio(result.created ? "register" : "login");
    onAccess(result.user, result.created);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (registering) { await access(true); return; }
      const { exists } = await api<{ exists: boolean }>(`/auth/username?username=${encodeURIComponent(username)}`);
      if (exists) await access(false); else { setRegistering(true); playAudio("open"); }
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  return <main className={`portrait-view login-view ${intro ? "is-intro" : ""}`}><Orientation portrait /><section className={`surface login-card ${registering ? "registration-card" : ""}`}><div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><span className="brand-suit suit-red">♥</span><h1 className="brand">Escalera</h1><span className="brand-suit">♣</span><span className="brand-suit suit-red">♦</span></div><form onSubmit={submit}><label>Benutzername<input value={username} onChange={(event) => { setUsername(event.target.value); setRegistering(false); }} minLength={3} maxLength={24} autoComplete="username" required /></label><label>Passwort<input value={password} onChange={(event) => { setPassword(event.target.value); setRegistering(false); }} minLength={12} type="password" autoComplete={registering ? "new-password" : "current-password"} required /></label>{registering && <><label>Passwort wiederholen<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} type="password" autoComplete="new-password" required /></label><label className="registration-warning"><input type="checkbox" checked={accepted} onChange={(event) => { setAccepted(event.target.checked); playAudio(event.target.checked ? "success" : "close"); }} required /><span>Ich verstehe: Ohne dieses Passwort kann mein Konto nicht wiederhergestellt werden.</span></label></>}{error && <p className="error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? "Einen Moment …" : registering ? "Konto verbindlich erstellen" : "Weiter"}</button>{registering && <button type="button" className="button-quiet" data-audio="close" onClick={() => setRegistering(false)}>Zurück zur Anmeldung</button>}</form><p className="login-note muted">Ist dein Name noch frei, bestätigst du im nächsten Schritt bewusst die Registrierung.</p></section></main>;
}

function LobbyListView({ user, connected, revision, error, setError, onLobby, onLogout, onProfile }: { user: User; connected: boolean; revision: number; error: string; setError: (value: string) => void; onLobby: (code: string) => Promise<void>; onLogout: () => Promise<void>; onProfile: () => void }) {
  const { play: playAudio } = useAudio();
  const [lobbies, setLobbies] = useState<Lobby[]>([]); const [search, setSearch] = useState(""); const [dialog, setDialog] = useState(false); const [busy, setBusy] = useState(false); const [loaded, setLoaded] = useState(false);
  const searchRef = useRef(search); searchRef.current = search;
  const refresh = useCallback(async (query: string) => {
    try { setLobbies(await api<Lobby[]>(`/lobbies?search=${encodeURIComponent(query)}`)); }
    catch (reason) { setError(message(reason)); }
    finally { setLoaded(true); }
  }, [setError]);
  useEffect(() => { void refresh(""); const timer = window.setInterval(() => void refresh(searchRef.current), 10_000); return () => window.clearInterval(timer); }, [refresh]);
  useEffect(() => { if (revision > 0) void refresh(searchRef.current); }, [revision, refresh]);
  const join = async (code: string) => { setBusy(true); setError(""); try { await api(`/lobbies/${code}/join`, { method: "POST", body: "{}" }); playAudio("lobbyJoin"); await onLobby(code); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } };
  return <main className="portrait-view lobby-list-view"><Orientation portrait /><header className="app-header"><button className="logout-button" data-audio="close" aria-label="Abmelden" onClick={() => void onLogout()}>⇥</button><div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><h1 className="brand brand-small">Escalera</h1><span className="brand-suit suit-red">♥</span></div><button className="profile-button" data-audio="open" aria-label="Profil öffnen" onClick={onProfile}><Avatar user={user} /></button></header><section className="lobby-list-content"><div className="welcome-row"><h2 className="welcome">Willkommen, {user.username}</h2><Connection connected={connected} /></div><hr className="lobby-divider" /><form className="lobby-tools" onSubmit={(event) => { event.preventDefault(); void refresh(search); }}><input aria-label="Lobbys durchsuchen" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Lobbyname …" /><button className="button-icon" aria-label="Suchen">⌕</button><button type="button" className="button-primary create-button" data-audio="open" aria-label="Lobby erstellen" onClick={() => setDialog(true)}>+</button></form>{error && <p className="error">{error}</p>}<section className="surface lobby-browser" aria-busy={!loaded}><div className="list-title"><h3>Offene Lobbys</h3><span className="badge">{loaded ? lobbies.length : "…"}</span></div><div className="lobby-scroll">{!loaded ? <div className="empty-state lobby-loading" role="status"><strong>Lobbys werden gemischt …</strong><span className="muted">Einen Moment bitte.</span></div> : lobbies.length ? lobbies.map((entry, index) => <article className="surface lobby-card" style={{ "--lobby-index": index } as React.CSSProperties} key={entry.code}><div className="lobby-card-info"><strong>{entry.name}</strong><div className="lobby-meta"><span className="lobby-pill">{entry.code}</span><span className="lobby-pill">{entry.players.length}/{entry.settings.maxPlayers} Spieler</span><span className="lobby-pill">Erstellt von {entry.host.username}</span></div></div><button className="join-button" disabled={busy} onClick={() => void join(entry.code)}>Beitreten</button></article>) : <div className="empty-state"><strong>Noch keine Lobby offen.</strong><span className="muted">Erstelle die erste Runde.</span></div>}</div></section></section>{dialog && <LobbySettingsDialog defaultName={`${user.username}'s Lobby`} onClose={() => setDialog(false)} onCreated={onLobby} setError={setError} />}</main>;
}

function LobbySettingsDialog({ onClose, onCreated, setError, lobby, defaultName }: { onClose: () => void; onCreated?: (code: string) => Promise<void>; setError: (value: string) => void; lobby?: Lobby; defaultName?: string }) {
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

function LobbyView({ user, lobby, connected, error, setError, onLeave, onProfile }: { user: User; lobby: Lobby; connected: boolean; error: string; setError: (value: string) => void; onLeave: () => Promise<boolean>; onProfile: (userId: string) => void }) {
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
  return <main className="portrait-view lobby-view"><Orientation portrait /><header className="app-header"><button className="logout-button" aria-label="Lobby verlassen" onClick={() => void onLeave()}>⇥</button><div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><h1 className="brand brand-small">Escalera</h1><span className="brand-suit suit-red">♥</span></div><button className="profile-button" aria-label="Profil öffnen" onClick={() => onProfile(user.id)}><Avatar user={user} /></button></header><section className="lobby-layout"><h2 className="lobby-name">{lobby.name}</h2><div className="lobby-settings-row"><section className="setting-badges"><span className="badge">{lobby.settings.maxPlayers} Spieler</span><span className="badge">{lobby.settings.jokersPerPlayer} Joker</span><span className="badge">{lobby.settings.maxTurnSeconds ?? "∞"} Sek.</span><span className="badge">Straße {lobby.settings.streetsRequireSameSuit ? "mit Zeichen" : "frei"}</span></section>{isHost && <button className="button-icon lobby-settings-button" aria-label="Lobby-Einstellungen" onClick={() => setEditing(true)}>⚙</button>}</div><section className="surface members-panel"><div className="list-title lobby-player-title"><h2>Spieler</h2><span>{lobby.players.length}/{lobby.settings.maxPlayers}</span></div><div className={`member-list ${allReady ? "all-ready" : ""}`}>{lobby.players.map((player) => <article className={`member-card ${player.ready ? "is-ready" : "is-waiting"} ${player.connected ? "" : "is-offline"}`} key={player.user.id}><Avatar user={player.user} onClick={() => onProfile(player.user.id)} /><div><strong>{player.user.username}</strong><span>{player.user.id === lobby.host.id ? "♛ Gastgeber" : "Spieler"} · {player.connected ? "Online" : "Offline"}</span></div><span className="member-state">{player.ready ? "✓ Bereit" : "○ Wartet"}</span></article>)}{emptySeats.map((_, index) => <article className="member-card member-slot-empty" aria-label="Freier Spielerplatz" key={`empty-${index}`}><span className="empty-seat-icon">+</span><strong>Freier Platz</strong><span>Wartet auf Spieler</span></article>)}</div></section>{error && <p className="error">{error}</p>}<footer className="lobby-actions"><button onClick={() => void action(self?.ready ? "not-ready" : "ready")}>{self?.ready ? "Nicht bereit" : "Bereit"}</button></footer></section>{editing && <LobbySettingsDialog lobby={lobby} onClose={() => setEditing(false)} setError={setError} />}</main>;
}

// The client mirrors the server by calling the very same rule functions, so a
// highlighted target can never disagree with what the engine would accept.
// Compare server/src/game/game-engine.ts: layPhase, layAdditionalMeld, addCardToMeld.
function meldAccepts(meld: GameMeld, card: Card) {
  const cards = [...meld.cards, card];
  return (meld.type === "group" ? validateGroup(cards, 3) : validateStreet(cards, { minimumSize: 3, sameSuit: meld.sameSuit })).valid;
}
function canLayMeld(cards: Card[], sameSuit: boolean) {
  return cards.length >= 3 && (validateGroup(cards, 3).valid || validateStreet(cards, { minimumSize: 3, sameSuit }).valid);
}
function canLayPhase(cards: Card[], phase: number) {
  try { return validatePhase(phase as Phase, phaseGroups(cards, phase)).valid; } catch { return false; }
}

// A card that already exists in the DOM (hand or meld) but is still "in the
// air": it renders hidden while an overlay flight travels onto its measured
// position, then pops visible the moment the flight lands (#50).
type Arrival = { from: Rect; face: string; showBack?: boolean; flip?: { start: number; end: number }; via?: { dx: number; dy: number }; fromTilt?: number; toTilt?: number; duration?: number; delay?: number; onArrive?: () => void };

const DEAL_STEP = GAME_START_TIMING_MS.dealStep;    // ms between two consecutively dealt cards
const DEAL_FLIGHT = GAME_START_TIMING_MS.dealFlight; // ms a dealt card travels to its owner

function PlayerStatLabels({ coins, cards, penalty }: { coins: number; cards: number; penalty?: number }) {
  return <span className="player-stat-labels" aria-label={`${coins} Münzen, ${cards} Karten${penalty === undefined ? "" : `, ${penalty} Strafpunkte`}`}>
    <span className="player-stat"><b>{coins}</b><span aria-hidden="true">◉</span></span>
    <span className="player-stat"><b>{cards}</b><span aria-hidden="true">▣</span></span>
    {penalty !== undefined && <span className="player-stat"><b>{penalty}</b><span aria-hidden="true">⚑</span></span>}
  </span>;
}

function GameView({ user, lobby, game, connected, introHold, onGame, onLeave, onProfile, onTutorial }: { user: User; lobby: Lobby; game: Game; connected: boolean; introHold: boolean; onGame: (game: Game) => void; onLeave: () => Promise<boolean>; onProfile: (userId: string) => void; onTutorial: () => void }) {
  const { play: playAudio, setScene: setAudioScene } = useAudio();
  const [menu, setMenu] = useState(false); const [scoreboard, setScoreboard] = useState(false); const [sort, setSort] = useState<"rank" | "suit">("rank");
  const [selected, setSelected] = useState<string[]>([]); const [pendingAction, setPendingAction] = useState<string | null>(null); const [actionError, setActionError] = useState("");
  const actionGate = useRef(false);
  const busy = pendingAction !== null;
  const [dismissedRound, setDismissedRound] = useState<number | null>(null);
  const [leaveConfirmation, setLeaveConfirmation] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const leaveGate = useRef(false);
  const [drag, setDrag] = useState<{ cardId: string; x: number; y: number; zone: string | null } | null>(null);
  const [events, setEvents] = useState<Array<{ key: string; text: string }>>([]);
  const [buyPosition, setBuyPosition] = useState<{ left: number; top: number; width: number } | null>(null);
  const reduced = usePrefersReducedMotion();
  const anchors = useRef(new Map<string, HTMLElement>());
  const anchor = useCallback((key: string) => (el: HTMLElement | null) => { if (el) anchors.current.set(key, el); else anchors.current.delete(key); }, []);
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    setAudioScene(game.state.status === "FINISHED" ? "results" : "game");
    return () => setAudioScene("game");
  }, [game.state.status, setAudioScene]);
  const previousActivePlayer = useRef(game.state.activePlayerId);
  useEffect(() => {
    if (previousActivePlayer.current !== game.state.activePlayerId) {
      playAudio("turn", { dedupeKey: `${game.version}-${game.state.activePlayerId}`, intensity: game.state.activePlayerId === user.id ? 1 : .62 });
      previousActivePlayer.current = game.state.activePlayerId;
    }
  }, [game.state.activePlayerId, game.version, playAudio, user.id]);
  const resultSounds = useRef(new Set<string>());
  useEffect(() => {
    const result = game.state.lastRoundResult;
    if (!result) return;
    const key = `round-${result.round}`;
    if (resultSounds.current.has(key)) return;
    resultSounds.current.add(key);
    playAudio(result.endedById === user.id ? "roundWin" : "roundLose", { dedupeKey: `${lobby.code}-${key}` });
  }, [game.state.lastRoundResult, lobby.code, playAudio, user.id]);
  useEffect(() => {
    if (game.state.status !== "FINISHED") return;
    const placement = game.state.placements.find((entry) => entry.userId === user.id)?.rank;
    playAudio(placement === 1 ? "gameWin" : "gameLose", { dedupeKey: `${lobby.code}-final` });
  }, [game.state.placements, game.state.status, lobby.code, playAudio, user.id]);

  const initialDealKey = game.state.status === "ACTIVE" && game.state.round === 1 && game.state.ownHand.length >= INITIAL_HAND_SIZE ? `escalera-deal-${lobby.code}-${game.state.round}` : null;
  const initialTurnOpensAt = game.state.turn.opensAt ? Date.parse(game.state.turn.opensAt) : Number.NaN;
  // The authoritative start barrier is also the idempotency boundary: a new
  // tab after turns have opened (or a legacy snapshot without opensAt) must
  // render server truth immediately instead of replaying the opening deal.
  const prepareDealOnMount = useRef(Boolean(initialDealKey && Number.isFinite(initialTurnOpensAt) && initialTurnOpensAt > Date.now() && !reduced && !hasSessionFlag(initialDealKey)));
  const dealKey = prepareDealOnMount.current ? initialDealKey : null;
  const initialDealCount = game.state.players.length * INITIAL_HAND_SIZE;

  // Animation state (#50). Flights are travelling overlay cards; arrivals mark
  // real cards that stay hidden until their flight lands on them. The *Hold
  // values freeze displayed counts/piles at their pre-action value so numbers
  // and pile tops change exactly when a card arrives, not when the server
  // state does.
  const [flights, setFlights] = useState<FlightSpec[]>([]);
  const [arrivals, setArrivals] = useState<Record<string, Arrival>>({});
  const [dealStage, setDealStage] = useState<"drop" | "shuffle" | null>(null);
  const [dealRect, setDealRect] = useState<Rect | null>(null);
  const [dealing, setDealing] = useState(prepareDealOnMount.current);
  const [dealtIds, setDealtIds] = useState<Set<string> | null>(() => prepareDealOnMount.current ? new Set() : null);
  const [countHold, setCountHold] = useState<Record<string, number>>(() => prepareDealOnMount.current ? Object.fromEntries(game.state.players.filter((player) => player.userId !== user.id).map((player) => [player.userId, 0])) : {});
  const [discardHold, setDiscardHold] = useState<{ top: Card | null; count: number } | null>(() => prepareDealOnMount.current ? { top: null, count: 0 } : null);
  const [drawHold, setDrawHold] = useState<number | null>(() => prepareDealOnMount.current ? game.state.drawPileCount + initialDealCount + 1 : null);
  const gameRef = useRef(game); gameRef.current = game;

  const rectOf = useCallback((key: string): Rect | null => { const element = anchors.current.get(key); if (!element) return null; const box = element.getBoundingClientRect(); return { left: box.left, top: box.top, width: box.width, height: box.height }; }, []);
  useLayoutEffect(() => {
    if (!game.state.discardOffer?.available) { setBuyPosition(null); return; }
    const update = () => {
      const discard = rectOf("discard");
      if (!discard) return;
      const viewportWidth = window.innerWidth;
      const width = Math.min(Math.max(discard.width + 16, 144), viewportWidth - 16);
      const gap = Math.max(8, discard.height * .05);
      const hudBottom = root.current?.querySelector(".game-hud")?.getBoundingClientRect().bottom ?? 0;
      const left = Math.min(Math.max(discard.left + discard.width / 2 - width / 2, 8), viewportWidth - width - 8);
      const top = Math.max(hudBottom + gap, discard.top - gap - 48);
      setBuyPosition((current) => current && Math.abs(current.left - left) < .5 && Math.abs(current.top - top) < .5 && Math.abs(current.width - width) < .5 ? current : { left, top, width });
    };
    update();
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", update); };
  }, [game.state.discardOffer?.available, game.version, rectOf]);
  const seatTarget = useCallback((userId: string): Rect | null => { const box = rectOf(`seat:${userId}`); return box ? fitCardRect(box, .8) : null; }, [rectOf]);
  const seatRects = useRef(new Map<string, Rect>());
  const previousSeatRects = useRef(new Map<string, Rect>());
  useLayoutEffect(() => {
    previousSeatRects.current = seatRects.current;
    const next = new Map<string, Rect>();
    for (const player of game.state.players) {
      const box = rectOf(`seat:${player.userId}`);
      if (box) next.set(player.userId, fitCardRect(box, .8));
    }
    seatRects.current = next;
  });
  const pushFlight = (flight: FlightSpec) => setFlights((current) => [...current, flight]);
  const addArrival = (cardId: string, arrival: Arrival) => setArrivals((current) => ({ ...current, [cardId]: arrival }));
  const holdCount = (userId: string, value: number | undefined) => { if (value !== undefined) setCountHold((current) => ({ ...current, [userId]: value })); };
  const releaseCount = (userId: string) => setCountHold((current) => { const { [userId]: _released, ...rest } = current; return rest; });

  const players = useMemo(() => game.state.players.map((player) => { const member = lobby.players.find((entry) => entry.user.id === player.userId); return { ...player, user: member?.user ?? { id: player.userId, username: "Spieler", avatarKey: null, tutorialCompleted: false }, connected: member?.connected ?? false }; }), [game.state.players, lobby.players]);
  const activePlayer = players.find((player) => player.userId === game.state.activePlayerId) ?? players[0];
  const turnOrder = players.filter((player) => player.userId !== game.state.activePlayerId);
  const hand = useMemo(() => [...game.state.ownHand].sort((a, b) => cardSort(a, b, sort)), [game.state.ownHand, sort]);
  const shownHand = dealtIds ? hand.filter((card) => dealtIds.has(card.id)) : hand;
  const shownCards = (player: { userId: string; handCount: number }) => countHold[player.userId] ?? player.handCount;
  const shownDraw = drawHold ?? game.state.drawPileCount;
  const shownDiscard = discardHold ?? { top: game.state.discardTop, count: game.state.discardPileCount };
  const self = game.state.players.find((player) => player.userId === user.id)!;
  const sameSuit = lobby.settings.streetsRequireSameSuit;
  const [turnBarrierTick, setTurnBarrierTick] = useState(0);
  useEffect(() => {
    const opensAt = game.state.turn.opensAt ? Date.parse(game.state.turn.opensAt) : Number.NaN;
    if (!Number.isFinite(opensAt)) return;
    const wait = opensAt - Date.now();
    if (wait <= 0) { setTurnBarrierTick((current) => current + 1); return; }
    const timer = window.setTimeout(() => setTurnBarrierTick((current) => current + 1), wait + 20);
    return () => window.clearTimeout(timer);
  }, [game.state.turn.opensAt]);
  const opensAt = game.state.turn.opensAt ? Date.parse(game.state.turn.opensAt) : Number.NaN;
  const turnOpened = !Number.isFinite(opensAt) || opensAt <= Date.now() || turnBarrierTick > 0;
  const mayAct = game.state.turn.canAct || (turnOpened && game.state.activePlayerId === user.id && !game.state.roundEndedById);
  // A server update is visually committed before another command may start.
  // This keeps a fast next player (or the buy action) from stacking a second
  // transition on top of cards and held counters that are still in flight.
  const visualBusy = introHold || dealing || flights.length > 0 || Object.keys(arrivals).length > 0;
  const canDraw = mayAct && !game.state.turn.hasDrawn && !busy && !visualBusy;
  const canPlay = mayAct && game.state.turn.hasDrawn && !busy && !visualBusy;
  // The buy offer is server-authoritative and time-sensitive. It remains
  // actionable while an older card flight is finishing; starting the purchase
  // fast-forwards that obsolete choreography to the current pile state.
  const canBuy = Boolean(game.state.discardOffer?.available) && self.coins >= 1 && !busy;
  const selectedCards = useMemo(() => hand.filter((card) => selected.includes(card.id)), [hand, selected]);
  const canDiscard = canPlay && selected.length === 1;
  // Only offer the meld zone when the selection would actually pass validation.
  const canLay = canPlay && (self.phaseLaid ? canLayMeld(selectedCards, sameSuit) : canLayPhase(selectedCards, game.state.phase));
  const openMelds = useMemo(() => canPlay && self.phaseLaid && selectedCards.length === 1 ? game.state.melds.filter((meld) => meldAccepts(meld, selectedCards[0])).map((meld) => meld.id) : [], [canPlay, self.phaseLaid, selectedCards, game.state.melds]);
  const targets = useMemo(() => new Set<string>([...(canDraw ? ["draw", ...(game.state.discardTop ? ["discard"] : [])] : []), ...(canDiscard ? ["discard"] : []), ...(canLay ? ["meldzone"] : []), ...openMelds.map((id) => `meld:${id}`)]), [canDraw, canDiscard, canLay, openMelds, game.state.discardTop]);

  useEffect(() => setSelected((current) => current.filter((id) => game.state.ownHand.some((card) => card.id === id))), [game.state.ownHand]);

  // Hand bookkeeping: remember every hand card's on-screen rect (outbound
  // flights start from the spot a card last occupied) and FLIP-shift the
  // remaining cards whenever the hand's composition changes, so inserts and
  // removals glide instead of snapping. The `translate` property composes
  // before the fan transform, so the glide happens in screen space.
  const handRects = useRef(new Map<string, Rect>());
  const handIds = shownHand.map((card) => card.id).join("|");
  const prevHandIds = useRef(handIds);
  useLayoutEffect(() => {
    const container = root.current; if (!container) return;
    const shifted = prevHandIds.current !== handIds; prevHandIds.current = handIds;
    const next = new Map(handRects.current);
    container.querySelectorAll<HTMLElement>(".hand-cards [data-fx-card]").forEach((element) => {
      const id = element.dataset.fxCard ?? ""; const box = element.getBoundingClientRect();
      const rect = { left: box.left, top: box.top, width: box.width, height: box.height };
      const previous = handRects.current.get(id);
      if (shifted && previous && !arrivals[id] && !reduced) {
        const dx = previous.left - rect.left; const dy = previous.top - rect.top;
        if (Math.abs(dx) + Math.abs(dy) > 3) element.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration: 240, easing: "cubic-bezier(.3,.7,.3,1)" });
      }
      next.set(id, rect);
    });
    handRects.current = next;
  });

  // Arrival spawner: a card that just appeared in the DOM is measured at its
  // final spot, kept hidden via .is-incoming, and an overlay flight travels
  // onto it. If the layout shifted while it was airborne, it glides the last
  // few pixels after landing.
  const spawned = useRef(new Set<string>());
  const cancelVisuals = useCallback(() => {
    // Keep the overlay, hidden destination cards and all held counters/piles
    // in one cancellation batch. Clearing spawned is essential: a later
    // arrival of the same card id must be allowed to create a fresh flight.
    spawned.current.clear();
    setFlights([]);
    setArrivals({});
    setCountHold({});
    setDiscardHold(null);
    setDrawHold(null);
  }, []);
  useLayoutEffect(() => {
    const container = root.current; if (!container) return;
    const pending = Object.entries(arrivals).filter(([id]) => !spawned.current.has(id));
    if (!pending.length) return;
    const additions: FlightSpec[] = [];
    for (const [id, arrival] of pending) {
      spawned.current.add(id);
      const element = container.querySelector<HTMLElement>(`[data-fx-card="${CSS.escape(id)}"]`);
      const clear = () => { spawned.current.delete(id); setArrivals((current) => { const { [id]: _done, ...rest } = current; return rest; }); arrival.onArrive?.(); };
      if (!element) { clear(); continue; }
      const box = element.getBoundingClientRect();
      const to = { left: box.left, top: box.top, width: box.width, height: box.height };
      additions.push({
        key: `arrival-${id}`, from: arrival.from, to, face: arrival.face, showBack: arrival.showBack, flip: arrival.flip, via: arrival.via, fromTilt: arrival.fromTilt, toTilt: arrival.toTilt, duration: arrival.duration, delay: arrival.delay,
        onArrive: () => {
          if (element.isConnected) {
            const now = element.getBoundingClientRect(); const dx = to.left - now.left; const dy = to.top - now.top;
            if (Math.abs(dx) + Math.abs(dy) > 3) element.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0px 0px" }], { duration: 200, easing: "ease-out" });
          }
          clear();
        }
      });
    }
    if (additions.length) setFlights((current) => [...current, ...additions]);
  });

  // Deal choreography (#50): the deck drops in from the top, riffle-shuffles,
  // then 11 cards per player travel out round-robin — opponents' cards to
  // their seat (ticking the counter 1…11), own cards sorted straight into the
  // hand. Finally the first discard flips onto the empty discard slot. The
  // sessionStorage flag keeps a reconnect within the same session from
  // replaying it; an interrupted run clears the flag so nothing sticks.
  const introHoldRef = useRef(introHold); introHoldRef.current = introHold;
  const timers = useRef<number[]>([]);
  const dealSettled = useRef(false);
  const fastForwardDeal = useCallback(() => {
    dealSettled.current = true;
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    setDealing(false);
    setDealStage(null);
    setDealRect(null);
    setDealtIds(null);
    cancelVisuals();
  }, [cancelVisuals]);
  useEffect(() => {
    if (!dealKey || reduced) return;
    if (hasSessionFlag(dealKey)) return;
    try { sessionStorage.setItem(dealKey, "1"); } catch { /* private mode: run once for this mount */ }
    const schedule = (ms: number, fn: () => void) => timers.current.push(window.setTimeout(fn, ms));
    const snapshot = gameRef.current;
    const initialDiscard = snapshot.state.discardTop;
    dealSettled.current = false;
    const order = snapshot.state.players.map((player) => player.userId);
    const ownOrder = snapshot.state.ownHand;
    const total = order.length * INITIAL_HAND_SIZE;
    setDealing(true);
    setDealtIds(new Set());
    setCountHold(Object.fromEntries(order.filter((id) => id !== user.id).map((id) => [id, 0])));
    setDiscardHold({ top: null, count: 0 });
    setDrawHold(snapshot.state.drawPileCount + total + 1);
    const start = introHoldRef.current ? Math.max(0, MATCH_INTRO_MS - 600) : 250;
    schedule(start, () => { setDealRect(rectOf("draw")); setDealStage("drop"); playAudio("deckDrop", { dedupeKey: `${dealKey}-drop` }); });
    schedule(start + DEAL_TIMING.drop, () => { setDealStage("shuffle"); playAudio("shuffle", { dedupeKey: `${dealKey}-shuffle` }); });
    const dealFrom = start + DEAL_TIMING.drop + DEAL_TIMING.shuffle;
    for (let index = 0; index < total; index += 1) {
      const playerId = order[index % order.length];
      const cardIndex = Math.floor(index / order.length);
      schedule(dealFrom + index * DEAL_STEP, () => {
        if (index === 0) setDealStage(null);
        playAudio("deal", { variant: index, intensity: index % order.length === 0 ? .72 : .48 });
        const from = rectOf("draw"); if (!from) return;
        setDrawHold((current) => (current === null ? null : current - 1));
        if (playerId === user.id) {
          const card = ownOrder[cardIndex]; if (!card) return;
          setDealtIds((current) => { const next = new Set(current ?? []); next.add(card.id); return next; });
          addArrival(card.id, { from, face: cardAsset(card), showBack: true, flip: { start: .25, end: .7 }, fromTilt: BOARD_TILT, duration: DEAL_FLIGHT });
        } else {
          const to = seatTarget(playerId); if (!to) return;
          pushFlight({ key: `deal-${index}`, from, to, face: CARD_BACK, showBack: true, fromTilt: BOARD_TILT, duration: DEAL_FLIGHT, onArrive: () => setCountHold((current) => ({ ...current, [playerId]: (current[playerId] ?? 0) + 1 })) });
        }
      });
    }
    const dealEnd = dealFrom + total * DEAL_STEP + DEAL_FLIGHT;
    schedule(dealEnd + 150, () => {
      const from = rectOf("draw"); const to = rectOf("discard"); const top = initialDiscard;
      setDrawHold(null);
      playAudio("flip", { dedupeKey: `${dealKey}-first-discard` });
      if (from && to && top) pushFlight({ key: "deal-first-discard", from, to, face: cardAsset(top), showBack: true, flip: { start: .3, end: .8 }, fromTilt: BOARD_TILT, toTilt: BOARD_TILT, duration: 560, onArrive: () => setDiscardHold(null) });
      else setDiscardHold(null);
    });
    schedule(dealEnd + 900, () => { dealSettled.current = true; setDealing(false); setDealtIds(null); setCountHold({}); });
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer)); timers.current = [];
      if (!dealSettled.current) { try { sessionStorage.removeItem(dealKey); } catch { /* no storage access */ } setDealing(false); setDealStage(null); setDealtIds(null); setCountHold({}); setDiscardHold(null); setDrawHold(null); }
    };
  }, [dealKey, playAudio, reduced]);

  // Action-driven animations, keyed by commandId, so a replayed realtime event
  // or a reconnect re-render never animates the same action twice. The first
  // state seen only seeds the set: joining a game in progress must not replay
  // history. Flight plans diff the previous state snapshot against the new one.
  const seen = useRef(new Set<string>()); const primed = useRef(false);
  const prevGame = useRef(game);
  useLayoutEffect(() => {
    const previous = prevGame.current; prevGame.current = game;
    const fresh = game.state.recentActions.filter((action) => !seen.current.has(action.commandId));
    for (const action of game.state.recentActions) seen.current.add(action.commandId);
    if (!primed.current) { primed.current = true; return; }
    if (!fresh.length) return;
    setEvents((current) => [...current, ...fresh.map((action) => ({ key: action.commandId, text: actionText(action, lobby, user.id) }))].slice(-3));
    for (const action of fresh) {
      const merged = action.type === "meld" && game.state.melds.length === previous.state.melds.length;
      const cue = audioCueForGameAction(action.type, merged);
      if (cue) playAudio(cue, { dedupeKey: action.commandId, intensity: action.userId === user.id ? 1 : .78 });
    }
    // Only adjacent versions have an unambiguous before/after snapshot. On a
    // reconnect or missed packet we deliberately fast-forward to the server
    // truth instead of inventing a flight from an aggregate diff. A round
    // rollover also replaces every pile/hand in one mutation and is therefore
    // never treated as the final discard of the old round.
    const plannedAction = fresh.length === 1 ? fresh[0] : null;
    if (!plannedAction || game.version !== previous.version + 1 || plannedAction.version !== game.version || previous.state.round !== game.state.round) {
      if (dealing) fastForwardDeal();
      else cancelVisuals();
      return;
    }
    // A fresh authoritative action wins over every older choreography. During
    // the opening deal this reveals the complete snapshot first, then plans the
    // action normally; it must never be marked seen and silently discarded.
    if (dealing) fastForwardDeal();
    else cancelVisuals();
    let meldsPlanned = false;
    for (const action of [plannedAction]) {
      const mine = action.userId === user.id;
      if (action.type === "timeout" || action.type === "disconnect-skip") {
        // Automatic turn completion is one authoritative mutation but two
        // visible beats: an optional draw followed by the forced discard.
        const includesDraw = action.metadata?.includesDraw ?? !previous.state.turn.hasDrawn;
        const includesDiscard = action.metadata?.includesDiscard ?? true;
        const previousCount = previous.state.players.find((player) => player.userId === action.userId)?.handCount ?? 0;
        const drawFrom = rectOf("draw");
        const discardTo = rectOf("discard");
        const discarded = game.state.discardTop;
        const oldDiscard = { top: previous.state.discardTop, count: previous.state.discardPileCount };
        const discardDelay = includesDraw ? 760 : 0;
        holdCount(action.userId, previousCount);
        if (includesDiscard) setDiscardHold(oldDiscard);

        if (mine) {
          const added = game.state.ownHand.find((entry) => !previous.state.ownHand.some((card) => card.id === entry.id));
          const removed = previous.state.ownHand.find((entry) => !game.state.ownHand.some((card) => card.id === entry.id));
          const handBox = rectOf("hand");
          const handTarget = handBox ? fitCardRect(handBox, .9) : null;
          if (includesDraw && drawFrom) {
            const onDrawn = () => setCountHold((current) => ({ ...current, [action.userId]: previousCount + 1 }));
            if (added) addArrival(added.id, { from: drawFrom, face: cardAsset(added), showBack: true, flip: { start: .18, end: .6 }, via: { dx: drawFrom.width * 1.15, dy: -drawFrom.height * .08 }, fromTilt: BOARD_TILT, duration: 700, onArrive: onDrawn });
            else if (handTarget && discarded) pushFlight({ key: `${action.commandId}-auto-draw`, from: drawFrom, to: handTarget, face: cardAsset(discarded), showBack: true, flip: { start: .2, end: .62 }, fromTilt: BOARD_TILT, duration: 700, onArrive: onDrawn });
          }
          if (includesDiscard && discardTo && discarded) {
            const from = (removed && handRects.current.get(removed.id)) ?? handTarget;
            if (from) pushFlight({ key: `${action.commandId}-auto-discard`, from, to: discardTo, face: cardAsset(discarded), toTilt: BOARD_TILT, duration: 520, delay: discardDelay, onArrive: () => { setDiscardHold(null); releaseCount(action.userId); } });
            else { setDiscardHold(null); releaseCount(action.userId); }
          } else if (!includesDiscard) releaseCount(action.userId);
        } else {
          const seat = previousSeatRects.current.get(action.userId) ?? seatTarget(action.userId);
          if (includesDraw && drawFrom && seat) pushFlight({ key: `${action.commandId}-auto-draw`, from: drawFrom, to: seat, face: CARD_BACK, showBack: true, fromTilt: BOARD_TILT, duration: 540, onArrive: () => setCountHold((current) => ({ ...current, [action.userId]: previousCount + 1 })) });
          if (includesDiscard && seat && discardTo && discarded) pushFlight({ key: `${action.commandId}-auto-discard`, from: seat, to: discardTo, face: cardAsset(discarded), showBack: true, flip: { start: .55, end: .94 }, toTilt: BOARD_TILT, duration: 620, delay: discardDelay, onArrive: () => { setDiscardHold(null); releaseCount(action.userId); } });
          else if (includesDiscard) { setDiscardHold(null); releaseCount(action.userId); }
          else releaseCount(action.userId);
        }
      } else if (action.type === "draw" || action.type === "buy") {
        const source = action.type === "buy" ? "discard" : action.metadata?.source ?? (game.state.discardPileCount < previous.state.discardPileCount ? "discard" : "draw");
        const from = rectOf(source); if (!from) continue;
        const fromDiscard = source === "discard";
        if (fromDiscard) setDiscardHold({ top: previous.state.discardTop, count: previous.state.discardPileCount });
        if (mine) {
          const card = game.state.ownHand.find((entry) => !previous.state.ownHand.some((own) => own.id === entry.id));
          if (!card) { if (fromDiscard) setDiscardHold(null); continue; }
          // Own draw: off the pile, a nudge to the right, flip face-up, then
          // glide into the sorted slot. A bought card is already face-up.
          if (source === "draw") addArrival(card.id, { from, face: cardAsset(card), showBack: true, flip: { start: .18, end: .58 }, via: { dx: from.width * 1.2, dy: -from.height * .08 }, fromTilt: BOARD_TILT, duration: 700 });
          else addArrival(card.id, { from, face: cardAsset(card), fromTilt: BOARD_TILT, duration: 620, onArrive: () => setDiscardHold(null) });
        } else {
          const to = seatTarget(action.userId); if (!to) { if (fromDiscard) setDiscardHold(null); continue; }
          holdCount(action.userId, previous.state.players.find((player) => player.userId === action.userId)?.handCount);
          pushFlight({ key: `${action.commandId}-fly`, from, to, face: fromDiscard && previous.state.discardTop ? cardAsset(previous.state.discardTop) : CARD_BACK, showBack: !fromDiscard, fromTilt: BOARD_TILT, duration: 540, onArrive: () => { if (fromDiscard) setDiscardHold(null); releaseCount(action.userId); } });
        }
      } else if (action.type === "discard") {
        const to = rectOf("discard"); const card = game.state.discardTop;
        if (!to || !card) continue;
        const hold = { top: previous.state.discardTop, count: previous.state.discardPileCount };
        if (mine) {
          const removed = previous.state.ownHand.find((entry) => !game.state.ownHand.some((own) => own.id === entry.id));
          const from = (removed && handRects.current.get(removed.id)) ?? rectOf("hand");
          if (!from) continue;
          setDiscardHold(hold);
          pushFlight({ key: `${action.commandId}-fly`, from, to, face: cardAsset(card), toTilt: BOARD_TILT, duration: 500, onArrive: () => setDiscardHold(null) });
        } else {
          const from = previousSeatRects.current.get(action.userId) ?? seatTarget(action.userId); if (!from) continue;
          setDiscardHold(hold);
          holdCount(action.userId, previous.state.players.find((player) => player.userId === action.userId)?.handCount);
          pushFlight({ key: `${action.commandId}-fly`, from, to, face: cardAsset(card), showBack: true, flip: { start: .55, end: .95 }, toTilt: BOARD_TILT, duration: 620, onArrive: () => { setDiscardHold(null); releaseCount(action.userId); } });
        }
      } else if (action.type === "phase" || action.type === "meld" || action.type === "add-to-meld") {
        // All meld growth between the two states animates once, attributed to
        // the acting player: own cards fly face-up from their hand slots,
        // opponents' cards travel face-down from their seat and flip on the
        // pile they now belong to.
        if (meldsPlanned) continue; meldsPlanned = true;
        const grown: Card[] = [];
        for (const meld of game.state.melds) {
          const before = previous.state.melds.find((entry) => entry.id === meld.id);
          grown.push(...meld.cards.filter((entry) => !before || !before.cards.some((card) => card.id === entry.id)));
        }
        if (!grown.length) continue;
        const previousCount = previous.state.players.find((player) => player.userId === action.userId)?.handCount;
        if (!mine) holdCount(action.userId, previousCount);
        const lastId = grown[grown.length - 1].id;
        grown.forEach((card, offset) => {
          const from = mine ? ((handRects.current.get(card.id) ?? rectOf("hand"))) : seatTarget(action.userId);
          if (!from) return;
          addArrival(card.id, mine
            ? { from, face: cardAsset(card), toTilt: BOARD_TILT, duration: 520, delay: offset * 70 }
            : { from, face: cardAsset(card), showBack: true, flip: { start: .5, end: .92 }, toTilt: BOARD_TILT, duration: 620, delay: offset * 80, onArrive: () => {
                if (card.id === lastId) releaseCount(action.userId);
                else setCountHold((current) => ({ ...current, [action.userId]: Math.max(0, (current[action.userId] ?? previousCount ?? 0) - 1) }));
              } });
        });
      }
    }
  }, [game.version, playAudio]);
  useEffect(() => { if (!events.length) return; const timer = window.setTimeout(() => setEvents((current) => current.slice(1)), 2600); return () => window.clearTimeout(timer); }, [events]);

  const act = async (path: string, body?: object, options: { interruptVisuals?: boolean } = {}) => {
    if (visualBusy && !options.interruptVisuals) return;
    await runSingleFlight(actionGate, async () => {
      if (options.interruptVisuals) cancelVisuals();
      setPendingAction(path); setActionError("");
      try { const result = await api<Game>(`/games/${lobby.code}/${path}`, { method: "POST", body: JSON.stringify({ commandId: crypto.randomUUID(), expectedVersion: game.version, payload: body ?? {} }) }); onGame(result); setSelected([]); }
      catch (reason) { if (reason instanceof ApiError && typeof reason.body === "object" && reason.body && "state" in reason.body && "version" in reason.body) onGame(reason.body as Game); setActionError(message(reason)); playAudio("error"); }
      finally { setPendingAction(null); }
    });
  };
  const toggleCard = (cardId: string) => setSelected((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  const laySelected = () => { try { if (self.phaseLaid) void act("melds", { cardIds: selected }); else void act("phase", { combinations: phaseGroups(selectedCards, game.state.phase).map((group) => group.map((card) => card.id)) }); } catch (reason) { setActionError(message(reason)); playAudio("dropInvalid"); } };
  const runZone = (zone: string, cardId?: string) => {
    const card = cardId ?? selected[0];
    if (zone === "draw" && canDraw) return void act("draw", { source: "draw" });
    if (zone === "discard" && canDiscard && card) return void act("discard", { cardId: card });
    if (zone === "discard" && canDraw) return void act("draw", { source: "discard" });
    if (zone === "meldzone" && canLay) return laySelected();
    if (zone.startsWith("meld:") && openMelds.includes(zone.slice(5)) && card) return void act(`melds/${zone.slice(5)}/cards`, { cardId: card });
    setActionError("Diese Karte passt hier nicht.");
    playAudio("dropInvalid");
  };
  const requestLeave = () => {
    setMenu(false);
    if (requiresLeaveConfirmation(game.state.status)) setLeaveConfirmation(true);
    else void onLeave();
  };
  const buyDiscard = () => { void act("buy", undefined, { interruptVisuals: true }); };
  const buyOnPointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return;
    event.preventDefault(); event.stopPropagation(); buyDiscard();
  };
  const buyOnClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    // Pointer and touch input already commits on pointerup. A synthetic click
    // with detail 0 is keyboard or assistive input and must remain supported.
    if (event.detail === 0) buyDiscard();
  };
  const confirmLeave = async () => {
    await runSingleFlight(leaveGate, async () => {
      setLeaveBusy(true);
      const left = await onLeave();
      if (!left) {
        setActionError("Die Lobby konnte nicht verlassen werden. Bitte versuche es erneut.");
        setLeaveBusy(false);
      }
    });
  };

  // Pointer events rather than HTML5 drag-and-drop: the native API emits nothing
  // on touch, so this is the only path that serves mouse and finger alike.
  const startDrag = (card: Card) => (event: React.PointerEvent) => {
    if (!canPlay || event.button > 0) return;
    const originX = event.clientX; const originY = event.clientY; let live = false;
    const zoneAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest("[data-zone]") as HTMLElement | null)?.dataset.zone ?? null;
    const move = (moveEvent: PointerEvent) => {
      // Only start dragging (and apply the dragged style) past a ~10px threshold,
      // so a small jitter on click never reads as a drag.
      if (!live && Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY) < 10) return;
      if (!live) { live = true; setSelected((current) => current.includes(card.id) ? current : [card.id]); playAudio("dragStart"); }
      const zone = zoneAt(moveEvent.clientX, moveEvent.clientY);
      setDrag({ cardId: card.id, x: moveEvent.clientX, y: moveEvent.clientY, zone });
    };
    const finish = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      setDrag(null);
      if (!live) return;
      const zone = zoneAt(upEvent.clientX, upEvent.clientY);
      if (zone) { if (targets.has(zone)) playAudio("dropValid"); runZone(zone, card.id); }
      else playAudio("dropInvalid");
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
  };
  // A zone is a target only if the rules accept it; hovering any other zone while
  // dragging reads as refused, which is the feedback without sending an action.
  const zoneClass = (zone: string) => targets.has(zone) ? "is-target" : drag?.zone === zone ? "is-refused" : "";

  const hint = dealing || !turnOpened ? "Mischen und Geben …" : !mayAct ? `${activePlayer?.user.username ?? "Spieler"} ist am Zug` : !game.state.turn.hasDrawn ? "Ziehe vom Stapel oder von der Ablage" : canLay ? "Auswahl in die Meld-Zone legen" : openMelds.length ? "An eine passende Auslage anlegen" : selected.length === 1 ? "Karte ablegen oder anlegen" : "Wähle Karten oder lege eine Karte ab";
  const showRoundResult = game.state.status === "ACTIVE" && game.state.lastRoundResult && dismissedRound !== game.state.lastRoundResult.round;
  return <main ref={root} className={`landscape-view game-view ${drag ? "is-dragging" : ""} ${dealStage ? "is-staging" : ""}`} data-version={game.version} {...(introHold ? { inert: true } : {})}>
    <Orientation landscape />
    <header className="game-hud">
      <section className="turn-order" aria-label="Zugreihenfolge"><span className="hud-kicker">Reihenfolge</span>{turnOrder.map((player, index) => <article className={`turn-order-player ${player.connected ? "" : "is-offline"}`} ref={anchor(`seat:${player.userId}`)} key={player.userId}><span className="turn-position">{index + 1}</span><Avatar user={player.user} onClick={() => onProfile(player.userId)} /><div><strong>{player.user.username}</strong><PlayerStatLabels coins={player.coins} cards={shownCards(player)} /></div></article>)}</section>
      <section className={`active-player-hud ${activePlayer?.userId === user.id ? "is-self" : ""}`} ref={anchor(`seat:${activePlayer?.userId}`)}><Avatar user={activePlayer.user} onClick={() => onProfile(activePlayer.userId)} /><div><span className="hud-kicker">{activePlayer.userId === user.id ? "Du bist am Zug" : "Am Zug"}</span><strong>{activePlayer.user.username}</strong><PlayerStatLabels coins={activePlayer.coins} cards={shownCards(activePlayer)} penalty={activePlayer.totalPenalty} /></div><TurnCountdown opensAt={game.state.turn.opensAt} deadlineAt={game.state.turn.deadlineAt} finished={game.state.status === "FINISHED"} /></section>
      <section className="phase-hud"><span className="hud-kicker">Runde {game.state.round}</span><strong>Phase {game.state.phase} / 7</strong><span className="phase-requirement">Ablegen: {phaseRequirement(game.state.phase)}</span><span>{self.phaseLaid ? "Phase ausgelegt" : "Phase offen"}</span></section>
    </header>
    <p className="turn-hint" aria-live="polite">{hint}</p>
    {game.state.discardOffer?.available && buyPosition && <button type="button" className="buy-button is-available" style={{ left: buyPosition.left, top: buyPosition.top, width: buyPosition.width }} disabled={!canBuy} aria-busy={pendingAction === "buy"} onPointerUp={buyOnPointerUp} onClick={buyOnClick}>{pendingAction === "buy" ? "Karte wird gekauft …" : "Ablage kaufen · 1 Münze"}</button>}
    <section className="game-board">
      <div className="pile-station">
        <div className={`pile-slot ${zoneClass("draw")}`} data-zone="draw" onClick={() => runZone("draw")}><button ref={anchor("draw")} className="game-pile draw-pile" aria-label={`Vom Stapel ziehen, ${shownDraw} Karten verbleiben`} disabled={!canDraw}><PileStack count={shownDraw} top={null} kind="draw" /></button></div>
        <span>Ziehstapel <b>[ {shownDraw} ]</b></span>
      </div>
      <div className={`meld-zone ${zoneClass("meldzone")}`} ref={anchor("meldzone")} data-zone="meldzone" onClick={() => canLay && runZone("meldzone")}>
        {game.state.melds.length ? game.state.melds.map((meld) => <article className={`meld-card ${openMelds.includes(meld.id) ? "is-target" : ""}`} data-zone={`meld:${meld.id}`} ref={anchor(`meld:${meld.id}`)} onClick={(event) => { event.stopPropagation(); runZone(`meld:${meld.id}`); }} key={meld.id} aria-label={`${meld.type === "group" ? "Gruppe" : "Straße"}: ${meld.cards.map(cardLabel).join(", ")}`}><div className="meld-cards" style={{ "--meld-count": meld.cards.length } as React.CSSProperties}>{meld.cards.map((card) => <CardFace card={card} fxId={card.id} incoming={!!arrivals[card.id]} key={card.id} />)}</div></article>) : <div className="empty-meld"><span className="empty-meld-icon">◇</span><strong>Meld-Zone</strong><span>Gruppen und Straßen erscheinen hier</span></div>}
      </div>
      <div className="pile-station">
        <div className={`pile-slot ${zoneClass("discard")}`} data-zone="discard" onClick={() => runZone("discard")}><button ref={anchor("discard")} className="game-pile discard-pile" aria-label={canDiscard ? "Ausgewählte Karte ablegen" : shownDiscard.top ? `${cardLabel(shownDiscard.top)} von der Ablage ziehen` : "Ablage ist leer"} disabled={!canDiscard && !(canDraw && game.state.discardTop)}><PileStack count={shownDiscard.count} top={shownDiscard.top} kind="discard" /></button></div>
        <span>Ablage <b>[ {shownDiscard.count} ]</b></span>
      </div>
    </section>
    <section className="player-hand" ref={anchor("hand")}><div className="hand-cards" role="group" aria-label="Deine Handkarten">{shownHand.map((card, index) => <button type="button" data-fx-card={card.id} onPointerDown={startDrag(card)} aria-label={`${cardLabel(card)}${selected.includes(card.id) ? ", ausgewählt" : ", nicht ausgewählt"}`} aria-pressed={selected.includes(card.id)} onClick={() => toggleCard(card.id)} className={`playing-card ${selected.includes(card.id) ? "is-selected" : ""} ${drag?.cardId === card.id ? "is-dragged" : ""} ${arrivals[card.id] ? "is-incoming" : ""}`} style={{ "--card-count": shownHand.length, "--card-index": index } as React.CSSProperties} key={card.id}><span className="card-3d"><CardFace card={card} /></span></button>)}</div></section>
    <nav className="game-nav" aria-label="Spielnavigation"><button className="game-nav-button" disabled={introHold} aria-label="Spielmenü öffnen" onClick={() => setMenu(true)}>☰ <span>Menü</span></button></nav>
    <GameStatusBar connected={connected} />
    <div className="game-events" aria-live="polite">{events.map((event) => <span className="game-event" key={event.key}>{event.text}</span>)}</div>
    {actionError && <div className="game-error" role="alert">{actionError}</div>}
    {drag && <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{(() => { const card = hand.find((entry) => entry.id === drag.cardId); return card ? <CardFace card={card} /> : null; })()}</div>}
    <FlightLayer flights={flights} reduced={reduced} onDone={(key) => setFlights((current) => current.filter((entry) => entry.key !== key))} />
    {dealStage && dealRect && <DealStage rect={dealRect} stage={dealStage} />}
    {menu && <aside className="game-menu surface"><div className="dialog-title"><h2>Spielmenü</h2><button className="button-icon" onClick={() => setMenu(false)}>×</button></div><div className="menu-sort"><span className="hud-kicker">Hand sortieren</span><div className="sort-control"><button className={sort === "rank" ? "is-active" : ""} aria-pressed={sort === "rank"} onClick={() => setSort("rank")}>Wert</button><button className={sort === "suit" ? "is-active" : ""} aria-pressed={sort === "suit"} onClick={() => setSort("suit")}>Farbe</button></div></div><button onClick={() => { setMenu(false); setScoreboard(true); }}>Scoreboard</button><button onClick={() => { setMenu(false); onProfile(user.id); }}>Mein Profil</button><button onClick={() => { setMenu(false); onTutorial(); }}>Kurzanleitung</button><button className="button-danger leave-game" onClick={requestLeave}>Lobby verlassen</button></aside>}
    {leaveConfirmation && <ConfirmationDialog title="Laufende Partie verlassen?" message="Du verlässt die Partie sofort. Falls du gerade am Zug bist, wird dein Zug automatisch beendet." busy={leaveBusy} confirmLabel="Ja, Partie verlassen" busyLabel="Partie wird verlassen …" onConfirm={() => void confirmLeave()} onCancel={() => setLeaveConfirmation(false)} />}
    {scoreboard && <Scoreboard game={game} lobby={lobby} onClose={() => setScoreboard(false)} />}
    {showRoundResult && <RoundResultOverlay result={game.state.lastRoundResult!} nextPhase={game.state.phase} lobby={lobby} onContinue={() => setDismissedRound(game.state.lastRoundResult!.round)} />}
    {game.state.status === "FINISHED" && <FinalResultOverlay placements={game.state.placements} lobby={lobby} onLeave={onLeave} />}
  </main>;
}

function actionText(action: RecentGameAction, lobby: Lobby, selfId: string) {
  const who = action.userId === selfId ? "Du" : playerName(lobby, action.userId);
  const verb: Record<string, string> = { draw: "zieht eine Karte", buy: "kauft die Ablage", discard: "legt ab", phase: "legt die Phase aus", meld: "legt eine Kombination aus", "add-to-meld": "legt an", timeout: "hat die Zeit überschritten", "disconnect-skip": "wurde übersprungen" };
  return `${who} ${verb[action.type] ?? action.type}`;
}

function GameStatusBar({ connected }: { connected: boolean }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30_000); return () => window.clearInterval(timer); }, []);
  const time = now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return <div className="game-status-bar" aria-label={`Verbindung ${connected ? "sehr gut" : "unterbrochen"}, ${time}`}><SignalIcon online={connected} /><b>|</b><time>{time}</time></div>;
}

function SignalIcon({ online }: { online: boolean }) {
  return <svg className={`signal-icon ${online ? "online" : ""}`} viewBox="0 0 16 13" aria-hidden="true" focusable="false"><path d="M1 4.2a10.5 10.5 0 0 1 14 0" /><path d="M3.6 7.2a6.8 6.8 0 0 1 8.8 0" /><path d="M6.2 10.1a3 3 0 0 1 3.6 0" /></svg>;
}

function Scoreboard({ game, lobby, onClose }: { game: Game; lobby: Lobby; onClose: () => void }) {
  const rounds = [...game.state.roundResults].sort((a, b) => a.round - b.round);
  const rows = buildScoreboardRows(rounds, game.state.players);
  return <div className="game-result-overlay"><section className="surface result-panel scoreboard-panel"><div className="dialog-title"><div><p className="overline">Runde {game.state.round} · Phase {game.state.phase}</p><h2>Scoreboard</h2></div><button className="button-icon" onClick={onClose}>×</button></div><div className="result-table scoreboard-current">{rows.map((row) => { const player = game.state.players.find((entry) => entry.userId === row.userId)!; return <div className="result-row" key={row.userId}><strong>{playerName(lobby, row.userId)}</strong><span>{player.handCount} Karten</span><span>{player.coins} Münzen</span><b>{row.totalPenalty} P</b></div>; })}</div><section className="score-history" aria-labelledby="score-history-title"><div className="score-history-heading"><h3 id="score-history-title">Strafen je Runde</h3><span>{rounds.length} von 7 abgeschlossen</span></div>{rounds.length ? <div className="score-history-scroll" tabIndex={0}><table><caption className="sr-only">Strafpunkte aller Spieler nach Runde</caption><thead><tr><th scope="col">Spieler</th>{rounds.map((round) => <th scope="col" title={`Runde ${round.round}, Phase ${round.phase}`} key={round.round}><span>R{round.round}</span><small>Phase {round.phase}</small></th>)}<th scope="col">Gesamt</th></tr></thead><tbody>{rows.map((row) => <tr key={row.userId}><th scope="row">{playerName(lobby, row.userId)}</th>{row.penalties.map((penalty, index) => <td key={`${row.userId}-${rounds[index].round}`}>{penalty === null ? <span aria-label="Keine Wertung">—</span> : penalty === 0 ? "0" : `+${penalty}`}</td>)}<td><strong>{row.totalPenalty}</strong></td></tr>)}</tbody></table></div> : <p className="score-history-empty">Noch keine Runde abgeschlossen.</p>}</section></section></div>;
}

function RoundResultOverlay({ result, nextPhase, lobby, onContinue }: { result: RoundResult; nextPhase: number; lobby: Lobby; onContinue: () => void }) {
  return <div className="game-result-overlay"><section className="surface result-panel"><div><p className="overline">Phase {result.phase} geschafft von {playerName(lobby, result.endedById)}</p><h2>Runde {result.round} beendet</h2></div><div className="result-table">{[...result.scores].sort((a, b) => a.totalPenalty - b.totalPenalty).map((score) => <div className="result-row" key={score.userId}><strong>{playerName(lobby, score.userId)}</strong><span>+{score.penalty} Punkte</span><b>{score.totalPenalty} P gesamt</b></div>)}</div><button className="button-primary" onClick={onContinue}>Phase {nextPhase} starten</button></section></div>;
}

function FinalResultOverlay({ placements, lobby, onLeave }: { placements: FinalPlacement[]; lobby: Lobby; onLeave: () => Promise<boolean> }) {
  return <div className="game-result-overlay final-result"><section className="surface result-panel"><div><p className="overline">Alle sieben Phasen gespielt</p><h2>Partie beendet</h2></div><div className="result-table">{placements.map((placement) => <div className={`result-row placement-${placement.rank}`} key={placement.userId}><strong>#{placement.rank} {playerName(lobby, placement.userId)}</strong><b>{placement.totalPenalty} Punkte</b></div>)}</div><button className="button-primary" onClick={() => void onLeave()}>Zur Lobbyliste</button></section></div>;
}

function playerName(lobby: Lobby, userId: string) { return lobby.players.find((entry) => entry.user.id === userId)?.user.username ?? "Spieler"; }

function TurnCountdown({ opensAt, deadlineAt, finished }: { opensAt: string | null; deadlineAt: string | null; finished: boolean }) {
  const { play: playAudio } = useAudio();
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, []);
  const preparing = opensAt ? Math.max(0, Math.ceil((Date.parse(opensAt) - now) / 1000)) : 0;
  const remaining = !finished && preparing === 0 && deadlineAt ? Math.max(0, Math.ceil((Date.parse(deadlineAt) - now) / 1000)) : null;
  useEffect(() => {
    if (remaining === 10 || (remaining !== null && remaining <= 5 && remaining > 0)) playAudio("warning", { dedupeKey: `${deadlineAt}-${remaining}`, intensity: remaining === 10 ? .82 : .55 });
  }, [deadlineAt, playAudio, remaining]);
  if (finished) return null;
  if (preparing > 0) return <span className="turn-countdown" aria-label={`Spielstart in ${preparing} Sekunden`}>…</span>;
  return <span className={`turn-countdown ${remaining !== null && remaining <= 10 ? "is-urgent" : ""}`} aria-label={remaining === null ? "Keine Zugbegrenzung" : `${remaining} Sekunden verbleibend`}>{remaining === null ? "∞" : `${remaining}s`}</span>;
}

function ProfileDialog({ viewer, userId, onUser, onTutorial, onClose }: { viewer: User; userId: string; onUser: (user: User) => void; onTutorial: () => void; onClose: () => void }) {
  const { preferences, setPreferences, play: playAudio } = useAudio();
  const [file, setFile] = useState<File | null>(null);
  const [avatarActions, setAvatarActions] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileStatistics | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const saveAudioTimer = useRef<number | null>(null);
  const pendingAudio = useRef(preferences);
  const audioDirty = useRef(false);
  useEffect(() => { pendingAudio.current = preferences; }, [preferences]);
  useEffect(() => { api<ProfileStatistics>(`/profile/users/${userId}`).then(setProfile).catch((reason) => { setError(message(reason)); playAudio("error"); }); }, [playAudio, userId]);
  useEffect(() => () => {
    if (saveAudioTimer.current !== null) window.clearTimeout(saveAudioTimer.current);
    if (!audioDirty.current) return;
    void fetch(`${API_URL}/profile/audio`, {
      method: "PUT",
      credentials: "include",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(pendingAudio.current)
    });
  }, []);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const upload = async (selectedFile: File) => {
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("file", selectedFile);
      const updated = (await api<{ user: User }>("/profile/avatar", { method: "POST", body })).user;
      onUser(updated); setProfile((current) => current ? { ...current, user: updated } : current); setAvatarActions(false); playAudio("success");
    } catch (reason) { setError(message(reason)); playAudio("error"); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError("");
    try { const updated = (await api<{ user: User }>("/profile/avatar", { method: "DELETE" })).user; onUser(updated); setProfile((current) => current ? { ...current, user: updated } : current); setAvatarActions(false); playAudio("success"); }
    catch (reason) { setError(message(reason)); playAudio("error"); } finally { setBusy(false); }
  };
  const queueAudioSave = (next: AudioPreferences) => {
    pendingAudio.current = next;
    audioDirty.current = true;
    setPreferences(next);
    if (saveAudioTimer.current !== null) window.clearTimeout(saveAudioTimer.current);
    saveAudioTimer.current = window.setTimeout(async () => {
      const submitted = pendingAudio.current;
      try {
        const saved = await api<AudioPreferences>("/profile/audio", { method: "PUT", body: JSON.stringify(submitted) });
        if (pendingAudio.current === submitted) {
          audioDirty.current = false;
          setPreferences(saved);
        }
      } catch (reason) { setError(message(reason)); playAudio("error"); }
    }, 320);
  };
  const setAudioLevel = (key: "music" | "effects", value: number) => queueAudioSave({ ...pendingAudio.current, [key]: value });
  const toggleMute = () => {
    const next = { ...pendingAudio.current, muted: !pendingAudio.current.muted };
    queueAudioSave(next);
    if (preferences.muted) window.setTimeout(() => playAudio("success", { intensity: .55 }), 30);
  };
  const displayed = profile?.user ?? (viewer.id === userId ? viewer : { id: userId, username: "Spieler", avatarKey: null });
  const editable = viewer.id === userId;
  const avatar = preview ? <img src={preview} alt="Neue Profilbild-Vorschau" /> : <Avatar user={displayed} large />;
  const audioLevels: Array<{ key: "music" | "effects"; label: string }> = [
    { key: "music", label: "Musik" }, { key: "effects", label: "Soundeffekte" }
  ];
  return <div className="dialog-backdrop">
    <section className="surface dialog profile-dialog">
      <div className="dialog-title"><div><p className="overline">{editable ? "Dein Konto" : "Spielerprofil"}</p><h2>Profil</h2></div><button className="button-icon" data-audio="close" onClick={onClose} aria-label="Schließen">×</button></div>
      <div className="profile-summary">
        <div className="profile-preview">{avatar}{editable && <><button className="avatar-edit-button" data-audio="open" aria-label="Profilbild bearbeiten" onClick={() => setAvatarActions((open) => !open)}>✎</button>{avatarActions && <div className="avatar-actions"><label className="button button-primary">Hochladen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) { setFile(selected); void upload(selected); } }} /></label><button disabled={!displayed.avatarKey || busy} className="button-danger" onClick={() => void remove()}>Löschen</button></div>}</>}</div>
        <div><strong className="profile-name">{displayed.username}</strong>{profile && <div className="stat-grid"><span><b>{profile.statistics.gamesPlayed}</b> Spiele</span><span><b>{profile.statistics.gamesWon}</b> Siege</span><span><b>{profile.statistics.totalPenalty}</b> Strafpunkte</span><span><b>{profile.statistics.cardsBought}</b> Käufe</span></div>}</div>
      </div>
      {editable && <section className={`profile-audio ${preferences.muted ? "is-muted" : ""}`} aria-labelledby="audio-settings-title">
        <div className="profile-audio-title"><div><p className="overline">Sound & Musik</p><h3 id="audio-settings-title">Audio-Mix</h3></div><button type="button" className={`audio-mute ${preferences.muted ? "is-active" : ""}`} data-audio="silent" aria-pressed={preferences.muted} onClick={toggleMute}>{preferences.muted ? "Ton einschalten" : "Stummschalten"}</button></div>
        <div className="audio-levels">{audioLevels.map(({ key, label }) => <label className="audio-level" key={key}><span>{label}<output>{preferences[key]}%</output></span><input data-audio="silent" type="range" min="0" max="100" step="1" value={preferences[key]} onInput={(event) => setAudioLevel(key, Number(event.currentTarget.value))} aria-label={`${label}-Lautstärke`} /></label>)}</div>
      </section>}
      {profile && <div className="profile-actions"><button className="button achievements-open" data-audio="open" onClick={() => setTreeOpen(true)}><span aria-hidden="true">✦</span> Erfolgsbaum ansehen<small>{profile.tree.flatMap((branch) => branch.nodes).filter((node) => node.unlocked).length} / {profile.tree.flatMap((branch) => branch.nodes).length} freigeschaltet</small></button>{editable && <button className="button" data-audio="open" onClick={onTutorial}>Kurzanleitung</button>}</div>}
      {error && <p className="error" role="alert">{error}</p>}
    </section>
    {treeOpen && profile && <AchievementTreeOverlay tree={profile.tree} username={displayed.username} onClose={() => setTreeOpen(false)} />}
  </div>;
}

function abbreviateThreshold(value: number) { return value >= 1000 ? `${value % 1000 === 0 ? value / 1000 : (value / 1000).toFixed(1)}k` : String(value); }

const BRANCH_GLYPH: Record<string, string> = { phases: "❖", streets: "≣", wins: "★", market: "⛁", penalty: "⚠", coins: "◉", moves: "♟" };

type NodePlacement = { branch: AchievementBranch; node: AchievementNode; index: number; x: number; y: number };
type Tooltip = { node: AchievementNode; branch: AchievementBranch; x: number; y: number };

// Hover text: what you have already achieved and what is still required.
function tooltipLines(branch: AchievementBranch, node: AchievementNode): { done: string; need: string } {
  if (node.unlocked) {
    const when = node.unlockedAt ? new Date(node.unlockedAt).toLocaleDateString("de-DE") : null;
    return { done: `Freigeschaltet${when ? ` am ${when}` : ""}`, need: "Erledigt ✓" };
  }
  if (branch.kind === "phase") return { done: "Noch nicht gewonnen", need: `Beende die Runde in Phase ${node.threshold} als Erster.` };
  return { done: `Aktuell: ${branch.value} / ${node.threshold}`, need: `Noch ${node.threshold - branch.value} bis „${node.label}“.` };
}

// Achievement paths spread around the root instead of growing only to the right.
// The surrounding PanZoom keeps the larger map navigable on touch and desktop.
function AchievementTreeOverlay({ tree, username, onClose }: { tree: AchievementBranch[]; username: string; onClose: () => void }) {
  const [tip, setTip] = useState<Tooltip | null>(null);
  const tile = 64, branchStep = 112, pad = 130;
  const maxNodes = Math.max(...tree.map((branch) => branch.nodes.length));
  const radius = maxNodes * branchStep + pad;
  const width = radius * 2, height = radius * 2;
  const rootX = radius, rootY = radius;
  const recent = (at: string | null) => at !== null && Date.now() - Date.parse(at) < 30_000;

  const placements: NodePlacement[] = tree.flatMap((branch, branchIndex) => {
    const angle = -Math.PI / 2 + branchIndex * (Math.PI * 2 / tree.length);
    return branch.nodes.map((node, index) => {
      const distance = (index + 1) * branchStep;
      return { branch, node, index, x: rootX + Math.cos(angle) * distance, y: rootY + Math.sin(angle) * distance };
    });
  });
  const showTip = (placement: NodePlacement) => (event: React.PointerEvent | React.FocusEvent) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ node: placement.node, branch: placement.branch, x: rect.left + rect.width / 2, y: rect.top });
  };

  return <div className="tree-overlay" role="dialog" aria-label={`Erfolgsbaum von ${username}`}>
    <header className="tree-overlay-bar"><div><p className="overline">Erfolgsbaum</p><h2>{username}</h2></div><button className="button-icon" onClick={onClose} aria-label="Schließen">×</button></header>
    <PanZoom className="tree-canvas-viewport" contentWidth={width} contentHeight={height}>
      <div className="tree-canvas" style={{ width, height }}>
        <svg className="tree-wires" width={width} height={height} aria-hidden="true">
          {tree.map((branch) => { const first = placements.find((placement) => placement.branch.key === branch.key && placement.index === 0); return first ? <line className={`tree-wire ${first.node.unlocked ? "is-live" : ""}`} key={`root-${branch.key}`} x1={rootX} y1={rootY} x2={first.x} y2={first.y} /> : null; })}
          {placements.filter((placement) => placement.index > 0).map((placement) => { const previous = placements.find((candidate) => candidate.branch.key === placement.branch.key && candidate.index === placement.index - 1)!; return <line className={`tree-wire ${placement.node.unlocked ? "is-live" : ""}`} key={`w-${placement.node.id}`} x1={previous.x} y1={previous.y} x2={placement.x} y2={placement.y} />; })}
        </svg>
        <div className="tree-tile is-root" style={{ left: rootX - tile / 2, top: rootY - tile / 2, width: tile, height: tile }} aria-hidden="true"><span>♠</span></div>
        {tree.map((branch) => { const first = placements.find((placement) => placement.branch.key === branch.key && placement.index === 0); return first ? <span className="tree-row-title" key={`t-${branch.key}`} style={{ left: first.x, top: first.y - tile / 2 - 20 }}>{branch.title}</span> : null; })}
        {placements.map((placement) => {
          const { node, branch } = placement;
          return <button
            key={node.id}
            className={`tree-tile ${node.unlocked ? "is-unlocked" : "is-locked"} ${recent(node.unlockedAt) ? "is-fresh" : ""}`}
            style={{ left: placement.x - tile / 2, top: placement.y - tile / 2, width: tile, height: tile }}
            onPointerEnter={showTip(placement)}
            onFocus={showTip(placement)}
            onPointerLeave={() => setTip(null)}
            onBlur={() => setTip(null)}
            aria-label={`${branch.title}: ${node.label}${node.unlocked ? ", freigeschaltet" : ", gesperrt"}`}
          >
            <span className="tree-tile-glyph" aria-hidden="true">{BRANCH_GLYPH[branch.key] ?? "◆"}</span>
            <span className="tree-tile-value">{abbreviateThreshold(node.threshold)}</span>
          </button>;
        })}
      </div>
    </PanZoom>
    {tip && <div className="tree-tooltip" style={{ left: tip.x, top: tip.y }} role="tooltip">
      <strong>{tip.node.label}</strong>
      <span className="tree-tooltip-branch">{tip.branch.title}</span>
      {(() => { const lines = tooltipLines(tip.branch, tip.node); return <><span className="tree-tooltip-done">{lines.done}</span><span className="tree-tooltip-need">{lines.need}</span></>; })()}
    </div>}
    <p className="tree-hint muted">Ziehen zum Bewegen · Scrollen oder zwei Finger zum Zoomen</p>
  </div>;
}

// Self-contained pan/zoom surface: drag (mouse + one finger) pans, wheel and
// two-finger pinch zoom. Keeps content centred within a fixed viewport.
function PanZoom({ children, className, contentWidth, contentHeight }: { children: React.ReactNode; className?: string; contentWidth: number; contentHeight: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const clampScale = (scale: number) => Math.min(2.5, Math.max(0.3, scale));

  // Fit the whole tree on first mount so nothing starts off-screen.
  useLayoutEffect(() => {
    const box = viewport.current?.getBoundingClientRect();
    if (!box) return;
    const scale = clampScale(Math.min(box.width / contentWidth, box.height / contentHeight) * 0.96);
    setView({ scale, x: (box.width - contentWidth * scale) / 2, y: (box.height - contentHeight * scale) / 2 });
  }, [contentWidth, contentHeight]);

  const zoomAt = (clientX: number, clientY: number, factor: number) => {
    const box = viewport.current?.getBoundingClientRect(); if (!box) return;
    setView((current) => {
      const scale = clampScale(current.scale * factor);
      const ratio = scale / current.scale;
      const px = clientX - box.left, py = clientY - box.top;
      return { scale, x: px - (px - current.x) * ratio, y: py - (py - current.y) * ratio };
    });
  };
  const onWheel = (event: React.WheelEvent) => { event.preventDefault(); zoomAt(event.clientX, event.clientY, event.deltaY < 0 ? 1.12 : 1 / 1.12); };
  const onPointerDown = (event: React.PointerEvent) => {
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 2) { const [a, b] = [...pointers.current.values()]; pinch.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), scale: view.scale }; }
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const previous = pointers.current.get(event.pointerId); if (!previous) return;
    const now = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, now);
    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, (distance / pinch.current.distance) * (pinch.current.scale / view.scale));
      pinch.current.distance = distance; pinch.current.scale = view.scale;
      return;
    }
    setView((current) => ({ ...current, x: current.x + (now.x - previous.x), y: current.y + (now.y - previous.y) }));
  };
  const endPointer = (event: React.PointerEvent) => { pointers.current.delete(event.pointerId); if (pointers.current.size < 2) pinch.current = null; };

  return <div ref={viewport} className={`panzoom ${className ?? ""}`} onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer}>
    <div className="panzoom-content" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}>{children}</div>
  </div>;
}

const TUTORIAL_STEPS = [
  { title: "Dein Zug", text: "Ziehe zuerst eine Karte vom Nachzieh- oder Ablagestapel. Beende deinen Zug, indem du genau eine Karte abwirfst." },
  { title: "Sieben Phasen", text: "Lege die geforderte Kombination vollständig aus. Sobald jemand seine Hand leert, steigen alle gemeinsam in die nächste Phase auf." },
  { title: "Karten kaufen", text: "Solange der aktive Spieler die Ablage noch nicht genommen hat, kannst du ihre oberste Karte für eine Münze kaufen." },
  { title: "Das Ziel", text: "Nach Phase 7 endet die Partie. Weniger Strafpunkte bedeuten die bessere Platzierung." }
];

function TutorialDialog({ user, onUser, onClose }: { user: User; onUser: (user: User) => void; onClose: () => void }) {
  const { play: playAudio } = useAudio();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const finish = async () => {
    setBusy(true); setError("");
    try {
      if (!user.tutorialCompleted) onUser((await api<{ user: User }>("/profile/tutorial/complete", { method: "POST", body: "{}" })).user);
      playAudio("success");
      onClose();
    } catch (reason) { setError(message(reason)); playAudio("error"); } finally { setBusy(false); }
  };
  const current = TUTORIAL_STEPS[step];
  return <div className="dialog-backdrop tutorial-backdrop"><section className="surface dialog tutorial-dialog"><p className="overline">Kurzanleitung · {step + 1}/{TUTORIAL_STEPS.length}</p><div className="tutorial-suits" aria-hidden="true">♠ <span>♥</span> ♣ <span>♦</span></div><h2>{current.title}</h2><p>{current.text}</p><div className="tutorial-progress">{TUTORIAL_STEPS.map((_, index) => <span className={index === step ? "is-current" : ""} key={index} />)}</div>{error && <p className="error" role="alert">{error}</p>}<div className="tutorial-actions"><button className="button-quiet" disabled={busy} onClick={() => void finish()}>Überspringen</button>{step > 0 && <button disabled={busy} onClick={() => setStep(step - 1)}>Zurück</button>}<button className="button-primary" disabled={busy} onClick={() => step === TUTORIAL_STEPS.length - 1 ? void finish() : setStep(step + 1)}>{step === TUTORIAL_STEPS.length - 1 ? "Losspielen" : "Einloggen"}</button></div></section></div>;
}

function Avatar({ user, large = false, onClick }: { user: Pick<User, "id" | "username" | "avatarKey">; large?: boolean; onClick?: () => void }) {
  const className = `profile-icon ${large ? "profile-icon-large" : ""}`;
  const content = user.avatarKey
    ? <span className={className}><img src={`${API_URL}/profile/avatar/${user.id}?size=${large ? 512 : 128}&v=${encodeURIComponent(user.avatarKey)}`} alt="" /></span>
    : <span className={className} aria-hidden="true">{user.username[0].toUpperCase()}</span>;
  return onClick ? <button type="button" className="avatar-button" aria-label={`Profil von ${user.username} öffnen`} onClick={onClick}>{content}</button> : content;
}

function Orientation({ portrait, landscape }: { portrait?: boolean; landscape?: boolean }) { return <div className="orientation-notice"><div><div className="rotate-icon">↻</div><h2>Gerät drehen</h2><p className="muted">Diese Ansicht ist für {portrait ? "Hochformat" : landscape ? "Querformat" : "eine andere Ausrichtung"} gestaltet.</p></div></div>; }
function Connection({ connected }: { connected: boolean }) { return <span className={`connection ${connected ? "online" : ""}`}>{connected ? "Online" : "Verbinde"}</span>; }
// Splits a selection into the combinations the current phase demands. Throws when
// the shape is wrong; canLayPhase() turns that into a plain boolean for the UI.
function phaseGroups(cards: Card[], phase: number): Card[][] {
  if (phase === 7) return [cards];
  const requiredGroups = [2, 4, 6].includes(phase) ? 2 : 1;
  const groups = new Map<string, Card[]>(); const jokers = cards.filter((card) => card.kind === "joker");
  for (const card of cards) if (card.kind === "standard") groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  const combinations = [...groups.values()].sort((a, b) => b.length - a.length);
  if (combinations.length !== requiredGroups) throw new Error(`Wähle genau ${requiredGroups} Gruppe${requiredGroups === 1 ? "" : "n"} gleicher Werte.`);
  for (const joker of jokers) {
    const target = combinations.filter((combination) => !combination.some((card) => card.kind === "joker")).sort((a, b) => a.length - b.length)[0];
    if (!target) throw new Error("Pro Kombination ist nur ein Joker erlaubt.");
    target.push(joker);
  }
  return combinations;
}
function message(reason: unknown) { return reason instanceof Error ? reason.message : "Aktion konnte nicht ausgeführt werden."; }
