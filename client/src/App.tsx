import { FormEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { validateGroup, validatePhase, validateStreet } from "@escalera/game-rules";
import type { Card, Phase } from "@escalera/game-rules";

const API_URL = "/api";
const SOCKET_URL = window.location.origin;
const CARD_BACK = "/cards/CB.png";

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
type RecentGameAction = { commandId: string; userId: string; type: string; version: number; createdAt: string };
type ProfileStatistics = { user: Pick<User, "id" | "username" | "avatarKey">; statistics: Record<string, number>; achievements: Array<{ key: string; title: string; value: number; tier: number; tiers: number[]; next: number | null }> };
type Game = {
  version: number;
  state: {
    status: "ACTIVE" | "FINISHED";
    round: number;
    phase: number;
    activePlayerId: string;
    drawPileCount: number;
    discardTop: Card | null;
    discardOffer: { available: boolean; cardId: string } | null;
    turn: { hasDrawn: boolean; canAct: boolean; deadlineAt: string | null };
    melds: GameMeld[];
    roundEndedById: string | null;
    lastRoundResult: RoundResult | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [lobbyRevision, setLobbyRevision] = useState(0);

  useEffect(() => {
    api<{ user: User }>("/auth/me").then(async (result) => {
      setUser(result.user);
      const current = await api<Lobby | null>("/lobbies/current");
      if (!current) return;
      setLobby(current);
      if (current.status !== "OPEN") setGame(await api<Game>(`/lobbies/${current.code}/game`));
    }).catch(() => undefined).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!user) return;
    const live = io(`${SOCKET_URL}/realtime`, { withCredentials: true, transports: ["websocket"] });
    live.on("realtime:connected", () => { setConnected(true); setSocket(live); }); live.on("disconnect", () => { setConnected(false); setSocket(null); });
    live.on("lobby:update", (value: Lobby) => setLobby(value)); live.on("game:update", (value: Game) => setGame(value));
    live.on("lobbies:update", () => setLobbyRevision((value) => value + 1));
    live.on("lobby:deleted", () => { setLobby(null); setGame(null); setError("Die Lobby wurde wegen Inaktivität geschlossen."); });
    return () => { live.disconnect(); setSocket(null); setConnected(false); };
  }, [user]);
  useEffect(() => { if (!socket || !lobby?.code) return; socket.emit("lobby:watch", { code: lobby.code }); return () => { socket.emit("lobby:unwatch", { code: lobby.code }); }; }, [socket, lobby?.code]);

  const openLobby = async (code: string) => { const value = await api<Lobby>(`/lobbies/${code}`); setLobby(value); if (value.status === "ACTIVE") setGame(await api<Game>(`/lobbies/${code}/game`)); };
  const leaveLobby = async () => { if (!lobby) return; await api(`/lobbies/${lobby.code}/leave`, { method: "POST", body: "{}" }); setLobby(null); setGame(null); };
  const logout = async () => { await api("/auth/logout", { method: "POST", body: "{}" }); setUser(null); setLobby(null); setGame(null); setError(""); };
  const updateUser = (next: User) => {
    setUser(next);
    setLobby((current) => current ? {
      ...current,
      host: current.host.id === next.id ? { ...current.host, avatarKey: next.avatarKey } : current.host,
      players: current.players.map((player) => player.user.id === next.id ? { ...player, user: next } : player)
    } : current);
  };

  if (loading) return <main className="portrait-view centered"><p className="brand">Escalera</p></main>;
  if (!user) return <AccessView error={error} setError={setError} onAccess={(next, created) => { setUser(next); if (created) setTutorialOpen(true); }} />;
  const view = game && lobby && lobby.status !== "OPEN"
    ? <GameView user={user} lobby={lobby} game={game} connected={connected} onGame={setGame} onLeave={leaveLobby} onProfile={setProfileUserId} onTutorial={() => setTutorialOpen(true)} />
    : lobby
      ? <LobbyView user={user} lobby={lobby} connected={connected} error={error} setError={setError} onLeave={leaveLobby} onProfile={setProfileUserId} />
      : <LobbyListView user={user} connected={connected} revision={lobbyRevision} error={error} setError={setError} onLobby={openLobby} onLogout={logout} onProfile={() => setProfileUserId(user.id)} />;
  return <>{view}{profileUserId && <ProfileDialog viewer={user} userId={profileUserId} onUser={updateUser} onTutorial={() => { setProfileUserId(null); setTutorialOpen(true); }} onClose={() => setProfileUserId(null)} />}{tutorialOpen && <TutorialDialog user={user} onUser={updateUser} onClose={() => setTutorialOpen(false)} />}</>;
}

function AccessView({ error, setError, onAccess }: { error: string; setError: (value: string) => void; onAccess: (user: User, created: boolean) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [busy, setBusy] = useState(false);
  const access = async (registration: boolean) => {
    const result = await api<{ user: User; created: boolean }>("/auth/access", { method: "POST", body: JSON.stringify({ username, password, ...(registration ? { passwordConfirmation: confirmation, acceptPasswordLoss: accepted } : {}) }) });
    onAccess(result.user, result.created);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      if (registering) { await access(true); return; }
      const { exists } = await api<{ exists: boolean }>(`/auth/username?username=${encodeURIComponent(username)}`);
      if (exists) await access(false); else setRegistering(true);
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  return <main className="portrait-view login-view"><Orientation portrait /><section className={`surface login-card ${registering ? "registration-card" : ""}`}><div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><span className="brand-suit suit-red">♥</span><h1 className="brand">Escalera</h1><span className="brand-suit">♣</span><span className="brand-suit suit-red">♦</span></div><form onSubmit={submit}><label>Benutzername<input value={username} onChange={(event) => { setUsername(event.target.value); setRegistering(false); }} minLength={3} maxLength={24} autoComplete="username" required /></label><label>Passwort<input value={password} onChange={(event) => { setPassword(event.target.value); setRegistering(false); }} minLength={12} type="password" autoComplete={registering ? "new-password" : "current-password"} required /></label>{registering && <><label>Passwort wiederholen<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} minLength={12} type="password" autoComplete="new-password" required /></label><label className="registration-warning"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} required /><span>Ich verstehe: Ohne dieses Passwort kann mein Konto nicht wiederhergestellt werden.</span></label></>}{error && <p className="error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? "Einen Moment …" : registering ? "Konto verbindlich erstellen" : "Weiter"}</button>{registering && <button type="button" className="button-quiet" onClick={() => setRegistering(false)}>Zurück zur Anmeldung</button>}</form><p className="login-note muted">Ist dein Name noch frei, bestätigst du im nächsten Schritt bewusst die Registrierung.</p></section></main>;
}

function LobbyListView({ user, connected, revision, error, setError, onLobby, onLogout, onProfile }: { user: User; connected: boolean; revision: number; error: string; setError: (value: string) => void; onLobby: (code: string) => Promise<void>; onLogout: () => Promise<void>; onProfile: () => void }) {
  const [lobbies, setLobbies] = useState<Lobby[]>([]); const [search, setSearch] = useState(""); const [dialog, setDialog] = useState(false); const [busy, setBusy] = useState(false);
  const refresh = async (query = search) => { try { setLobbies(await api<Lobby[]>(`/lobbies?search=${encodeURIComponent(query)}`)); } catch (reason) { setError(message(reason)); } };
  useEffect(() => { void refresh(""); const timer = window.setInterval(() => void refresh(search), 10_000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (revision > 0) void refresh(search); }, [revision]);
  const join = async (code: string) => { setBusy(true); setError(""); try { await api(`/lobbies/${code}/join`, { method: "POST", body: "{}" }); await onLobby(code); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } };
  return <main className="portrait-view lobby-list-view"><Orientation portrait /><header className="app-header"><button className="logout-button" aria-label="Abmelden" onClick={() => void onLogout()}>⇥</button><div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><h1 className="brand brand-small">Escalera</h1><span className="brand-suit suit-red">♥</span></div><button className="profile-button" aria-label="Profil öffnen" onClick={onProfile}><Avatar user={user} /></button></header><section className="lobby-list-content"><div className="welcome-row"><h2 className="welcome">Willkommen, {user.username}</h2><Connection connected={connected} /></div><hr className="lobby-divider" /><form className="lobby-tools" onSubmit={(event) => { event.preventDefault(); void refresh(); }}><input aria-label="Lobbys durchsuchen" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Lobbyname …" /><button className="button-icon" aria-label="Suchen">⌕</button><button type="button" className="button-primary create-button" aria-label="Lobby erstellen" onClick={() => setDialog(true)}>+</button></form>{error && <p className="error">{error}</p>}<section className="surface lobby-browser"><div className="list-title"><h3>Offene Lobbys</h3><span className="badge">{lobbies.length}</span></div><div className="lobby-scroll">{lobbies.length ? lobbies.map((entry) => <article className="surface lobby-card" key={entry.code}><div className="lobby-card-info"><strong>{entry.name}</strong><div className="lobby-meta"><span className="lobby-pill">{entry.code}</span><span className="lobby-pill">{entry.players.length}/{entry.settings.maxPlayers} Spieler</span><span className="lobby-pill">Erstellt von {entry.host.username}</span></div></div><button className="join-button" disabled={busy} onClick={() => void join(entry.code)}>Beitreten</button></article>) : <div className="empty-state"><strong>Noch keine Lobby offen.</strong><span className="muted">Erstelle die erste Runde.</span></div>}</div></section></section>{dialog && <LobbySettingsDialog defaultName={`${user.username}'s Lobby`} onClose={() => setDialog(false)} onCreated={onLobby} setError={setError} />}</main>;
}

function LobbySettingsDialog({ onClose, onCreated, setError, lobby, defaultName }: { onClose: () => void; onCreated?: (code: string) => Promise<void>; setError: (value: string) => void; lobby?: Lobby; defaultName?: string }) {
  const initial = lobby?.settings ?? { maxPlayers: 4, jokersPerPlayer: 1, maxTurnSeconds: 60, streetsRequireSameSuit: true, confirmTurnEnd: true };
  const [name, setName] = useState(lobby?.name ?? defaultName ?? "");
  const [busy, setBusy] = useState(false); const [settings, setSettings] = useState({ ...initial, maxTurnSeconds: initial.maxTurnSeconds ?? 60 });
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { const { confirmTurnEnd: _confirmTurnEnd, ...lobbySettings } = settings; const saved = await api<Lobby>(lobby ? `/lobbies/${lobby.code}/settings` : "/lobbies", { method: "POST", body: JSON.stringify({ ...lobbySettings, name: name.trim() }) }); onClose(); if (!lobby) await onCreated?.(saved.code); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } };
  return <div className="dialog-backdrop" role="presentation"><section className="surface dialog"><div className="dialog-title"><h2>{lobby ? "Einstellungen" : "Lobby erstellen"}</h2><button className="button-icon" onClick={onClose} aria-label="Schließen">×</button></div><hr className="dialog-divider" /><form onSubmit={submit} className="settings-form"><label>Lobbyname<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={40} placeholder="Meine Lobby" required /></label><label>Maximale Spieler<select value={settings.maxPlayers} onChange={(event) => setSettings({ ...settings, maxPlayers: Number(event.target.value) })}>{[2,3,4,5,6].map((value) => <option key={value}>{value}</option>)}</select></label><label>Joker pro Spieler<select value={settings.jokersPerPlayer} onChange={(event) => setSettings({ ...settings, jokersPerPlayer: Number(event.target.value) })}>{[0,1,2,3,4,5,6].map((value) => <option key={value}>{value}</option>)}</select></label><label>Zeit pro Zug<select value={settings.maxTurnSeconds} onChange={(event) => setSettings({ ...settings, maxTurnSeconds: Number(event.target.value) })}>{[30,45,60,90,120,180].map((value) => <option key={value} value={value}>{value} Sekunden</option>)}</select></label><label className="toggle"><input type="checkbox" checked={settings.streetsRequireSameSuit} onChange={(event) => setSettings({ ...settings, streetsRequireSameSuit: event.target.checked })} />Straße gleiches Zeicen (♥ ♥ ♥) </label><label className="toggle"><input type="checkbox" checked={settings.confirmTurnEnd} onChange={(event) => setSettings({ ...settings, confirmTurnEnd: event.target.checked })} />Ablegen bestätigen</label><hr className="dialog-divider" /><button className="button-primary" disabled={busy}>{busy ? "Speichere …" : lobby ? "Speichern" : "Lobby erstellen"}</button></form></section></div>;
}

function LobbyView({ user, lobby, connected, error, setError, onLeave, onProfile }: { user: User; lobby: Lobby; connected: boolean; error: string; setError: (value: string) => void; onLeave: () => Promise<void>; onProfile: (userId: string) => void }) {
  const [editing, setEditing] = useState(false);
  const self = lobby.players.find((player) => player.user.id === user.id); const isHost = lobby.host.id === user.id;
  const emptySeats = Array.from({ length: Math.max(0, lobby.settings.maxPlayers - lobby.players.length) });
  const action = async (path: string) => { setError(""); try { await api(`/lobbies/${lobby.code}/${path}`, { method: "POST", body: "{}" }); } catch (reason) { setError(message(reason)); } };
  return <main className="portrait-view lobby-view"><Orientation portrait /><header className="app-header"><button className="logout-button" aria-label="Lobby verlassen" onClick={() => void onLeave()}>⇥</button><div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><h1 className="brand brand-small">Escalera</h1><span className="brand-suit suit-red">♥</span></div><button className="profile-button" aria-label="Profil öffnen" onClick={() => onProfile(user.id)}><Avatar user={user} /></button></header><section className="lobby-layout"><h2 className="lobby-name">{lobby.name}</h2><div className="lobby-settings-row"><section className="setting-badges"><span className="badge">{lobby.settings.maxPlayers} Spieler</span><span className="badge">{lobby.settings.jokersPerPlayer} Joker</span><span className="badge">{lobby.settings.maxTurnSeconds ?? "∞"} Sek.</span><span className="badge">Straße {lobby.settings.streetsRequireSameSuit ? "mit Zeichen" : "frei"}</span></section>{isHost && <button className="button-icon lobby-settings-button" aria-label="Lobby-Einstellungen" onClick={() => setEditing(true)}>⚙</button>}</div><section className="surface members-panel"><div className="list-title lobby-player-title"><h2>Spieler</h2><span>{lobby.players.length}/{lobby.settings.maxPlayers}</span></div><div className="member-list">{lobby.players.map((player) => <article className={`member-card ${player.ready ? "is-ready" : "is-waiting"} ${player.connected ? "" : "is-offline"}`} key={player.user.id}><Avatar user={player.user} onClick={() => onProfile(player.user.id)} /><div><strong>{player.user.username}</strong><span>{player.user.id === lobby.host.id ? "♛ Gastgeber" : "Spieler"} · {player.connected ? "Online" : "Offline"}</span></div><span className="member-state">{player.ready ? "✓ Bereit" : "○ Wartet"}</span></article>)}{emptySeats.map((_, index) => <article className="member-card member-slot-empty" aria-label="Freier Spielerplatz" key={`empty-${index}`}><span className="empty-seat-icon">+</span><strong>Freier Platz</strong><span>Wartet auf Spieler</span></article>)}</div></section>{error && <p className="error">{error}</p>}<footer className="lobby-actions"><button onClick={() => void action(self?.ready ? "not-ready" : "ready")}>{self?.ready ? "Nicht bereit" : "Bereit"}</button></footer></section>{editing && <LobbySettingsDialog lobby={lobby} onClose={() => setEditing(false)} setError={setError} />}</main>;
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

type Flight = { key: string; asset: string; from: DOMRect; to: DOMRect; flip: boolean };

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const listener = () => setReduced(query.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);
  return reduced;
}

function GameView({ user, lobby, game, connected, onGame, onLeave, onProfile, onTutorial }: { user: User; lobby: Lobby; game: Game; connected: boolean; onGame: (game: Game) => void; onLeave: () => Promise<void>; onProfile: (userId: string) => void; onTutorial: () => void }) {
  const [menu, setMenu] = useState(false); const [scoreboard, setScoreboard] = useState(false); const [sort, setSort] = useState<"rank" | "suit">("rank");
  const [selected, setSelected] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  const [dismissedRound, setDismissedRound] = useState<number | null>(null); const [dealing, setDealing] = useState(false);
  const [drag, setDrag] = useState<{ cardId: string; x: number; y: number; zone: string | null } | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]); const [events, setEvents] = useState<Array<{ key: string; text: string }>>([]);
  const reduced = usePrefersReducedMotion();
  const anchors = useRef(new Map<string, HTMLElement>());
  const anchor = useCallback((key: string) => (el: HTMLElement | null) => { if (el) anchors.current.set(key, el); else anchors.current.delete(key); }, []);

  const players = useMemo(() => game.state.players.map((player) => { const member = lobby.players.find((entry) => entry.user.id === player.userId); return { ...player, user: member?.user ?? { id: player.userId, username: "Spieler", avatarKey: null, tutorialCompleted: false }, connected: member?.connected ?? false }; }), [game.state.players, lobby.players]);
  const activePlayer = players.find((player) => player.userId === game.state.activePlayerId) ?? players[0];
  const turnOrder = players.filter((player) => player.userId !== game.state.activePlayerId);
  const hand = useMemo(() => [...game.state.ownHand].sort((a, b) => cardSort(a, b, sort)), [game.state.ownHand, sort]);
  const self = game.state.players.find((player) => player.userId === user.id)!;
  const sameSuit = lobby.settings.streetsRequireSameSuit;
  const canDraw = game.state.turn.canAct && !game.state.turn.hasDrawn && !busy;
  const canPlay = game.state.turn.canAct && game.state.turn.hasDrawn && !busy;
  const selectedCards = useMemo(() => hand.filter((card) => selected.includes(card.id)), [hand, selected]);
  const canDiscard = canPlay && selected.length === 1;
  // Only offer the meld zone when the selection would actually pass validation.
  const canLay = canPlay && (self.phaseLaid ? canLayMeld(selectedCards, sameSuit) : canLayPhase(selectedCards, game.state.phase));
  const openMelds = useMemo(() => canPlay && self.phaseLaid && selectedCards.length === 1 ? game.state.melds.filter((meld) => meldAccepts(meld, selectedCards[0])).map((meld) => meld.id) : [], [canPlay, self.phaseLaid, selectedCards, game.state.melds]);
  const targets = useMemo(() => new Set<string>([...(canDraw ? ["draw", ...(game.state.discardTop ? ["discard"] : [])] : []), ...(canDiscard ? ["discard"] : []), ...(canLay ? ["meldzone"] : []), ...openMelds.map((id) => `meld:${id}`)]), [canDraw, canDiscard, canLay, openMelds, game.state.discardTop]);

  useEffect(() => setSelected((current) => current.filter((id) => game.state.ownHand.some((card) => card.id === id))), [game.state.ownHand]);
  useEffect(() => { const key = `escalera-deal-${lobby.code}-${game.state.round}`; if (game.state.round === 1 && game.state.ownHand.length >= 11 && !sessionStorage.getItem(key)) { sessionStorage.setItem(key, "1"); setDealing(true); const timer = window.setTimeout(() => setDealing(false), reduced ? 0 : 3600); return () => window.clearTimeout(timer); } }, [game.state.ownHand.length, game.state.round, lobby.code, reduced]);

  // Animations are keyed by commandId, so a replayed realtime event or a
  // reconnect re-render never animates the same action twice. The first state
  // seen only seeds the set: joining a game in progress must not replay history.
  const seen = useRef(new Set<string>()); const primed = useRef(false);
  useEffect(() => {
    const fresh = game.state.recentActions.filter((action) => !seen.current.has(action.commandId));
    for (const action of game.state.recentActions) seen.current.add(action.commandId);
    if (!primed.current) { primed.current = true; return; }
    if (!fresh.length) return;
    setEvents((current) => [...current, ...fresh.map((action) => ({ key: action.commandId, text: actionText(action, lobby, user.id) }))].slice(-3));
    if (dealing) return;
    const rect = (key: string) => anchors.current.get(key)?.getBoundingClientRect();
    const next: Flight[] = [];
    for (const action of fresh) {
      const seat = action.userId === user.id ? "hand" : `seat:${action.userId}`;
      const plan = action.type === "draw" ? { from: "draw", to: seat, asset: CARD_BACK, flip: false }
        : action.type === "buy" ? { from: "discard", to: seat, asset: CARD_BACK, flip: false }
        : action.type === "discard" ? { from: seat, to: "discard", asset: game.state.discardTop ? cardAsset(game.state.discardTop) : CARD_BACK, flip: true }
        : action.type === "add-to-meld" ? { from: seat, to: "meldzone", asset: CARD_BACK, flip: false }
        : action.type === "phase" || action.type === "meld" ? { from: seat, to: "meldzone", asset: CARD_BACK, flip: false }
        : null;
      if (!plan) continue;
      const from = rect(plan.from); const to = rect(plan.to);
      if (from && to) next.push({ key: action.commandId, asset: plan.asset, from, to, flip: plan.flip });
    }
    if (next.length) setFlights((current) => [...current, ...next]);
  }, [game.version]);
  useEffect(() => { if (!events.length) return; const timer = window.setTimeout(() => setEvents((current) => current.slice(1)), 2600); return () => window.clearTimeout(timer); }, [events]);

  const act = async (path: string, body?: object) => {
    setBusy(true); setActionError("");
    try { const result = await api<Game>(`/games/${lobby.code}/${path}`, { method: "POST", body: JSON.stringify({ commandId: crypto.randomUUID(), expectedVersion: game.version, payload: body ?? {} }) }); onGame(result); setSelected([]); }
    catch (reason) { if (reason instanceof ApiError && typeof reason.body === "object" && reason.body && "state" in reason.body && "version" in reason.body) onGame(reason.body as Game); setActionError(message(reason)); }
    finally { setBusy(false); }
  };
  const toggleCard = (cardId: string) => setSelected((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  const laySelected = () => { try { if (self.phaseLaid) void act("melds", { cardIds: selected }); else void act("phase", { combinations: phaseGroups(selectedCards, game.state.phase).map((group) => group.map((card) => card.id)) }); } catch (reason) { setActionError(message(reason)); } };
  const runZone = (zone: string, cardId?: string) => {
    const card = cardId ?? selected[0];
    if (zone === "draw" && canDraw) return void act("draw", { source: "draw" });
    if (zone === "discard" && canDiscard && card) return void act("discard", { cardId: card });
    if (zone === "discard" && canDraw) return void act("draw", { source: "discard" });
    if (zone === "meldzone" && canLay) return laySelected();
    if (zone.startsWith("meld:") && openMelds.includes(zone.slice(5)) && card) return void act(`melds/${zone.slice(5)}/cards`, { cardId: card });
    setActionError("Diese Karte passt hier nicht.");
  };

  // Pointer events rather than HTML5 drag-and-drop: the native API emits nothing
  // on touch, so this is the only path that serves mouse and finger alike.
  const startDrag = (card: Card) => (event: React.PointerEvent) => {
    if (!canPlay || event.button > 0) return;
    const originX = event.clientX; const originY = event.clientY; let live = false;
    const zoneAt = (x: number, y: number) => (document.elementFromPoint(x, y)?.closest("[data-zone]") as HTMLElement | null)?.dataset.zone ?? null;
    const move = (moveEvent: PointerEvent) => {
      if (!live && Math.hypot(moveEvent.clientX - originX, moveEvent.clientY - originY) < 8) return;
      if (!live) { live = true; setSelected((current) => current.includes(card.id) ? current : [card.id]); }
      const zone = zoneAt(moveEvent.clientX, moveEvent.clientY);
      setDrag({ cardId: card.id, x: moveEvent.clientX, y: moveEvent.clientY, zone });
    };
    const finish = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", finish);
      setDrag(null);
      if (!live) return;
      const zone = zoneAt(upEvent.clientX, upEvent.clientY);
      if (zone) runZone(zone, card.id);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", finish);
  };
  // A zone is a target only if the rules accept it; hovering any other zone while
  // dragging reads as refused, which is the feedback without sending an action.
  const zoneClass = (zone: string) => targets.has(zone) ? "is-target" : drag?.zone === zone ? "is-refused" : "";

  const hint = !game.state.turn.canAct ? `${activePlayer?.user.username ?? "Spieler"} ist am Zug` : !game.state.turn.hasDrawn ? "Ziehe vom Stapel oder von der Ablage" : canLay ? "Auswahl in die Meld-Zone legen" : openMelds.length ? "An eine passende Auslage anlegen" : selected.length === 1 ? "Karte ablegen oder anlegen" : "Wähle Karten oder lege eine Karte ab";
  const showRoundResult = game.state.status === "ACTIVE" && game.state.lastRoundResult && dismissedRound !== game.state.lastRoundResult.round;
  return <main className={`landscape-view game-view ${drag ? "is-dragging" : ""}`} data-version={game.version}>
    <Orientation landscape />
    <header className="game-hud">
      <section className="turn-order" aria-label="Zugreihenfolge"><span className="hud-kicker">Reihenfolge</span>{turnOrder.map((player, index) => <article className={`turn-order-player ${player.connected ? "" : "is-offline"}`} ref={anchor(`seat:${player.userId}`)} key={player.userId}><span className="turn-position">{index + 1}</span><Avatar user={player.user} onClick={() => onProfile(player.userId)} /><div><strong>{player.user.username}</strong><span>{player.coins} Münzen · {player.handCount} Karten</span></div></article>)}</section>
      <section className={`active-player-hud ${activePlayer?.userId === user.id ? "is-self" : ""}`} ref={anchor(`seat:${activePlayer?.userId}`)}><Avatar user={activePlayer.user} onClick={() => onProfile(activePlayer.userId)} /><div><span className="hud-kicker">{activePlayer.userId === user.id ? "Du bist am Zug" : "Am Zug"}</span><strong>{activePlayer.user.username}</strong><span>{activePlayer.coins} Münzen · {activePlayer.totalPenalty} Punkte · {activePlayer.handCount} Karten</span></div><TurnCountdown deadlineAt={game.state.turn.deadlineAt} finished={game.state.status === "FINISHED"} /></section>
      <section className="phase-hud"><span className="hud-kicker">Runde {game.state.round}</span><strong>Phase {game.state.phase} / 7</strong><span>{self.phaseLaid ? "Phase ausgelegt" : "Phase offen"}</span></section>
    </header>
    <p className="turn-hint" aria-live="polite">{hint}</p>
    <section className="game-board">
      <div className="pile-station">
        <button ref={anchor("draw")} className={`game-pile draw-pile ${zoneClass("draw")}`} data-zone="draw" aria-label={`Vom Stapel ziehen, ${game.state.drawPileCount} Karten verbleiben`} disabled={!canDraw} onClick={() => runZone("draw")}><img src={CARD_BACK} alt="" /><strong className="pile-count">{game.state.drawPileCount}</strong></button>
        <span>Ziehstapel</span>
      </div>
      <div className={`meld-zone ${zoneClass("meldzone")}`} ref={anchor("meldzone")} data-zone="meldzone" onClick={() => canLay && runZone("meldzone")}>
        {game.state.melds.length ? game.state.melds.map((meld) => <article className={`meld-card ${openMelds.includes(meld.id) ? "is-target" : ""}`} data-zone={`meld:${meld.id}`} ref={anchor(`meld:${meld.id}`)} onClick={(event) => { event.stopPropagation(); runZone(`meld:${meld.id}`); }} key={meld.id} aria-label={`${meld.type === "group" ? "Gruppe" : "Straße"}: ${meld.cards.map(cardLabel).join(", ")}`}><div className="meld-cards" style={{ "--meld-count": meld.cards.length } as React.CSSProperties}>{meld.cards.map((card) => <CardFace card={card} key={card.id} />)}</div></article>) : <div className="empty-meld"><span className="empty-meld-icon">◇</span><strong>Meld-Zone</strong><span>Gruppen und Straßen erscheinen hier</span></div>}
      </div>
      <div className="pile-station">
        <button ref={anchor("discard")} className={`game-pile discard-pile ${zoneClass("discard")}`} data-zone="discard" aria-label={canDiscard ? "Ausgewählte Karte ablegen" : game.state.discardTop ? `${cardLabel(game.state.discardTop)} von der Ablage ziehen` : "Ablage ist leer"} disabled={!canDiscard && !(canDraw && game.state.discardTop)} onClick={() => runZone("discard")}>{game.state.discardTop ? <CardFace card={game.state.discardTop} /> : <strong>Leer</strong>}<strong className="pile-count">{game.state.discardTop ? 1 : 0}</strong></button>
        <span>Ablage</span>
        {game.state.discardOffer && <button className="buy-button" disabled={busy} onClick={() => void act("buy")}>Kaufen · 1 Münze</button>}
      </div>
    </section>
    <section className="player-hand" ref={anchor("hand")}><div className="hand-cards" role="group" aria-label="Deine Handkarten">{hand.map((card) => <button type="button" onPointerDown={startDrag(card)} aria-label={`${cardLabel(card)}${selected.includes(card.id) ? ", ausgewählt" : ", nicht ausgewählt"}`} aria-pressed={selected.includes(card.id)} onClick={() => toggleCard(card.id)} className={`playing-card ${selected.includes(card.id) ? "is-selected" : ""} ${drag?.cardId === card.id ? "is-dragged" : ""}`} style={{ "--card-count": hand.length } as React.CSSProperties} key={card.id}><CardFace card={card} /></button>)}</div></section>
    <nav className="game-nav" aria-label="Spielnavigation"><button className="game-nav-button" aria-label="Spielmenü öffnen" onClick={() => setMenu(true)}>☰ <span>Menü</span></button></nav>
    <GameStatusBar connected={connected} />
    <div className="game-events" aria-live="polite">{events.map((event) => <span className="game-event" key={event.key}>{event.text}</span>)}</div>
    {actionError && <div className="game-error" role="alert">{actionError}</div>}
    {drag && <div className="drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden="true">{(() => { const card = hand.find((entry) => entry.id === drag.cardId); return card ? <CardFace card={card} /> : null; })()}</div>}
    <div className="flight-layer" aria-hidden="true">{flights.map((flight) => <CardFlight flight={flight} reduced={reduced} onDone={() => setFlights((current) => current.filter((entry) => entry.key !== flight.key))} key={flight.key} />)}</div>
    {dealing && <DealAnimation players={players} selfId={user.id} />}
    {menu && <aside className="game-menu surface"><div className="dialog-title"><h2>Spielmenü</h2><button className="button-icon" onClick={() => setMenu(false)}>×</button></div><div className="menu-sort"><span className="hud-kicker">Hand sortieren</span><div className="sort-control"><button className={sort === "rank" ? "is-active" : ""} aria-pressed={sort === "rank"} onClick={() => setSort("rank")}>Wert</button><button className={sort === "suit" ? "is-active" : ""} aria-pressed={sort === "suit"} onClick={() => setSort("suit")}>Farbe</button></div></div><button onClick={() => { setMenu(false); setScoreboard(true); }}>Scoreboard</button><button onClick={() => { setMenu(false); onProfile(user.id); }}>Mein Profil</button><button onClick={() => { setMenu(false); onTutorial(); }}>Kurzanleitung</button><button className="button-danger leave-game" onClick={() => void onLeave()}>Lobby verlassen</button></aside>}
    {scoreboard && <Scoreboard game={game} lobby={lobby} onClose={() => setScoreboard(false)} />}
    {showRoundResult && <RoundResultOverlay result={game.state.lastRoundResult!} nextPhase={game.state.phase} lobby={lobby} onContinue={() => setDismissedRound(game.state.lastRoundResult!.round)} />}
    {game.state.status === "FINISHED" && <FinalResultOverlay placements={game.state.placements} lobby={lobby} onLeave={onLeave} />}
  </main>;
}

// Reduced motion still gets a cue, just not a travelling one: the card pulses at
// its destination instead of flying. "Reduced" in the ticket means less movement,
// not a silent board where nothing is traceable.
function CardFlight({ flight, reduced, onDone }: { flight: Flight; reduced: boolean; onDone: () => void }) {
  const ref = useRef<HTMLImageElement>(null);
  useLayoutEffect(() => {
    const element = ref.current; if (!element) return onDone();
    const scale = flight.to.width / Math.max(1, flight.from.width);
    const target = `translate(${flight.to.left}px, ${flight.to.top}px) scale(${scale})`;
    const animation = reduced
      ? element.animate([{ transform: target, opacity: 0 }, { transform: target, opacity: .95, offset: .35 }, { transform: target, opacity: 0 }], { duration: 620, easing: "ease-out", fill: "forwards" })
      : element.animate([
          { transform: `translate(${flight.from.left}px, ${flight.from.top}px) scale(1) rotateY(${flight.flip ? "180deg" : "0deg"})`, opacity: 0 },
          { opacity: 1, offset: .12 },
          { transform: `${target} rotateY(0deg)`, opacity: 0 }
        ], { duration: 520, easing: "cubic-bezier(.22,.7,.25,1)", fill: "forwards" });
    animation.onfinish = onDone; animation.oncancel = onDone;
    return () => animation.cancel();
  }, []);
  return <img className="flight-card" ref={ref} src={flight.asset} alt="" style={{ width: flight.from.width, height: flight.from.height }} />;
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

function DealAnimation({ players, selfId }: { players: Array<{ userId: string }>; selfId: string }) {
  return <div className="deal-animation" aria-hidden="true"><img className="deal-deck" src={CARD_BACK} alt="" />{players.flatMap((player, playerIndex) => Array.from({ length: 11 }, (_, cardIndex) => { const isSelf = player.userId === selfId; return <img className={`deal-card ${isSelf ? "to-self" : "to-opponent"}`} src={CARD_BACK} alt="" style={{ "--deal-delay": `${(playerIndex * 11 + cardIndex) * 38}ms`, "--target-x": isSelf ? `${(cardIndex - 5) * 3.1}vw` : `${-38 + playerIndex * 15 + (cardIndex - 5) * .18}vw`, "--target-y": isSelf ? "43vh" : "-38vh", "--target-r": `${(cardIndex - 5) * 1.5}deg` } as React.CSSProperties} key={`${player.userId}-${cardIndex}`} />; }))}<img className="deal-rest-deck" src={CARD_BACK} alt="" /><img className="deal-first-discard" src="/cards/5C.svg" alt="" /></div>;
}

function Scoreboard({ game, lobby, onClose }: { game: Game; lobby: Lobby; onClose: () => void }) {
  return <div className="game-result-overlay"><section className="surface result-panel"><div className="dialog-title"><div><p className="overline">Runde {game.state.round} · Phase {game.state.phase}</p><h2>Scoreboard</h2></div><button className="button-icon" onClick={onClose}>×</button></div><div className="result-table">{[...game.state.players].sort((a, b) => a.totalPenalty - b.totalPenalty).map((player) => <div className="result-row" key={player.userId}><strong>{playerName(lobby, player.userId)}</strong><span>{player.handCount} Karten</span><span>{player.coins} Münzen</span><b>{player.totalPenalty} P</b></div>)}</div></section></div>;
}

function RoundResultOverlay({ result, nextPhase, lobby, onContinue }: { result: RoundResult; nextPhase: number; lobby: Lobby; onContinue: () => void }) {
  return <div className="game-result-overlay"><section className="surface result-panel"><div><p className="overline">Phase {result.phase} geschafft von {playerName(lobby, result.endedById)}</p><h2>Runde {result.round} beendet</h2></div><div className="result-table">{[...result.scores].sort((a, b) => a.totalPenalty - b.totalPenalty).map((score) => <div className="result-row" key={score.userId}><strong>{playerName(lobby, score.userId)}</strong><span>+{score.penalty} Punkte</span><b>{score.totalPenalty} P gesamt</b></div>)}</div><button className="button-primary" onClick={onContinue}>Phase {nextPhase} starten</button></section></div>;
}

function FinalResultOverlay({ placements, lobby, onLeave }: { placements: FinalPlacement[]; lobby: Lobby; onLeave: () => Promise<void> }) {
  return <div className="game-result-overlay final-result"><section className="surface result-panel"><div><p className="overline">Alle sieben Phasen gespielt</p><h2>Partie beendet</h2></div><div className="result-table">{placements.map((placement) => <div className={`result-row placement-${placement.rank}`} key={placement.userId}><strong>#{placement.rank} {playerName(lobby, placement.userId)}</strong><b>{placement.totalPenalty} Punkte</b></div>)}</div><button className="button-primary" onClick={() => void onLeave()}>Zur Lobbyliste</button></section></div>;
}

function playerName(lobby: Lobby, userId: string) { return lobby.players.find((entry) => entry.user.id === userId)?.user.username ?? "Spieler"; }

function TurnCountdown({ deadlineAt, finished }: { deadlineAt: string | null; finished: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 250); return () => window.clearInterval(timer); }, []);
  if (finished) return null;
  const remaining = deadlineAt ? Math.max(0, Math.ceil((Date.parse(deadlineAt) - now) / 1000)) : null;
  return <span className={`turn-countdown ${remaining !== null && remaining <= 10 ? "is-urgent" : ""}`} aria-label={remaining === null ? "Keine Zugbegrenzung" : `${remaining} Sekunden verbleibend`}>{remaining === null ? "∞" : `${remaining}s`}</span>;
}

function ProfileDialog({ viewer, userId, onUser, onTutorial, onClose }: { viewer: User; userId: string; onUser: (user: User) => void; onTutorial: () => void; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [avatarActions, setAvatarActions] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<ProfileStatistics | null>(null);
  useEffect(() => { api<ProfileStatistics>(`/profile/users/${userId}`).then(setProfile).catch((reason) => setError(message(reason))); }, [userId]);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const upload = async (file: File) => {
    setBusy(true); setError("");
    try {
      const body = new FormData(); body.append("file", file);
      const updated = (await api<{ user: User }>("/profile/avatar", { method: "POST", body })).user;
      onUser(updated); setProfile((current) => current ? { ...current, user: updated } : current); setAvatarActions(false);
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true); setError("");
    try { const updated = (await api<{ user: User }>("/profile/avatar", { method: "DELETE" })).user; onUser(updated); setProfile((current) => current ? { ...current, user: updated } : current); setAvatarActions(false); }
    catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  const displayed = profile?.user ?? (viewer.id === userId ? viewer : { id: userId, username: "Spieler", avatarKey: null });
  const editable = viewer.id === userId;
  const avatar = preview ? <img src={preview} alt="Neue Profilbild-Vorschau" /> : <Avatar user={displayed} large />;
  return <div className="dialog-backdrop"><section className="surface dialog profile-dialog"><div className="dialog-title"><div><p className="overline">{editable ? "Dein Konto" : "Spielerprofil"}</p><h2>Profil</h2></div><button className="button-icon" onClick={onClose} aria-label="Schließen">×</button></div><div className="profile-summary"><div className="profile-preview">{avatar}{editable && <><button className="avatar-edit-button" aria-label="Profilbild bearbeiten" onClick={() => setAvatarActions((open) => !open)}>✎</button>{avatarActions && <div className="avatar-actions"><label className="button button-primary">Hochladen<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) { setFile(selected); void upload(selected); } }} /></label><button disabled={!displayed.avatarKey || busy} className="button-danger" onClick={() => void remove()}>Löschen</button></div>}</>}</div><div><strong className="profile-name">{displayed.username}</strong>{profile && <div className="stat-grid"><span><b>{profile.statistics.gamesPlayed}</b> Spiele</span><span><b>{profile.statistics.gamesWon}</b> Siege</span><span><b>{profile.statistics.totalPenalty}</b> Strafpunkte</span><span><b>{profile.statistics.cardsBought}</b> Käufe</span></div>}</div></div>{profile && <div className="achievement-list">{profile.achievements.map((achievement) => <article key={achievement.key}><div><strong>{achievement.title}</strong><span>Stufe {achievement.tier}/3</span></div><progress value={achievement.value} max={achievement.next ?? Math.max(achievement.value, 1)} /><small>{achievement.next ? `${achievement.value} / ${achievement.next}` : "Vollständig"}</small></article>)}</div>}{error && <p className="error" role="alert">{error}</p>}</section></div>;
}

const TUTORIAL_STEPS = [
  { title: "Dein Zug", text: "Ziehe zuerst eine Karte vom Nachzieh- oder Ablagestapel. Beende deinen Zug, indem du genau eine Karte abwirfst." },
  { title: "Sieben Phasen", text: "Lege die geforderte Kombination vollständig aus. Sobald jemand seine Hand leert, steigen alle gemeinsam in die nächste Phase auf." },
  { title: "Karten kaufen", text: "Solange der aktive Spieler die Ablage noch nicht genommen hat, kannst du ihre oberste Karte für eine Münze kaufen." },
  { title: "Das Ziel", text: "Nach Phase 7 endet die Partie. Weniger Strafpunkte bedeuten die bessere Platzierung." }
];

function TutorialDialog({ user, onUser, onClose }: { user: User; onUser: (user: User) => void; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const finish = async () => {
    setBusy(true); setError("");
    try {
      if (!user.tutorialCompleted) onUser((await api<{ user: User }>("/profile/tutorial/complete", { method: "POST", body: "{}" })).user);
      onClose();
    } catch (reason) { setError(message(reason)); } finally { setBusy(false); }
  };
  const current = TUTORIAL_STEPS[step];
  return <div className="dialog-backdrop tutorial-backdrop"><section className="surface dialog tutorial-dialog"><p className="overline">Kurzanleitung · {step + 1}/{TUTORIAL_STEPS.length}</p><div className="tutorial-suits" aria-hidden="true">♠ <span>♥</span> ♣ <span>♦</span></div><h2>{current.title}</h2><p>{current.text}</p><div className="tutorial-progress">{TUTORIAL_STEPS.map((_, index) => <span className={index === step ? "is-current" : ""} key={index} />)}</div>{error && <p className="error" role="alert">{error}</p>}<div className="tutorial-actions"><button className="button-quiet" disabled={busy} onClick={() => void finish()}>Überspringen</button>{step > 0 && <button disabled={busy} onClick={() => setStep(step - 1)}>Zurück</button>}<button className="button-primary" disabled={busy} onClick={() => step === TUTORIAL_STEPS.length - 1 ? void finish() : setStep(step + 1)}>{step === TUTORIAL_STEPS.length - 1 ? "Losspielen" : "Weiter"}</button></div></section></div>;
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
function suitSymbol(suit: string) { return ({ clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" } as Record<string, string>)[suit] ?? "?"; }
function cardLabel(card: Card) { return card.kind === "joker" ? "Joker" : `${card.rank} ${suitSymbol(card.suit)}`; }
function cardAsset(card: Card) { if (card.kind === "joker") return "/cards/J.png"; const rank = card.rank === "10" ? "T" : card.rank; const suit = ({ clubs: "C", diamonds: "D", hearts: "H", spades: "S" } as Record<string, string>)[card.suit]; return `/cards/${rank}${suit}.svg`; }
function CardFace({ card }: { card: Card }) { return <img className="card-face" src={cardAsset(card)} alt={cardLabel(card)} draggable={false} />; }
function isRed(card: Card) { return card.kind === "standard" && (card.suit === "hearts" || card.suit === "diamonds"); }
function cardSort(a: Card, b: Card, mode: "rank" | "suit") { const rank = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]; const av = a.kind === "joker" ? 99 : mode === "rank" ? rank.indexOf(a.rank) : a.suit.localeCompare(b.kind === "standard" ? b.suit : "zz"); const bv = b.kind === "joker" ? 99 : mode === "rank" ? rank.indexOf(b.rank) : 0; return typeof av === "number" && typeof bv === "number" ? av - bv : 0; }
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
