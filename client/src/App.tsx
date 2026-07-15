import { FormEvent, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

type User = { id: string; username: string; avatarKey: string | null; tutorialCompleted: boolean };
type Lobby = {
  code: string;
  status: "OPEN" | "ACTIVE" | "CLOSED";
  host: Pick<User, "id" | "username">;
  settings: { maxPlayers: number; jokersPerPlayer: number; maxTurnSeconds: number | null; streetsRequireSameSuit: boolean; confirmTurnEnd: boolean };
  players: Array<{ user: User; ready: boolean; connected: boolean }>;
};
type Card = { id: string; kind: "joker" } | { id: string; kind: "standard"; rank: string; suit: string; deck: number };
type GameMeld = { id: string; ownerId: string; type: "group" | "street"; cards: Card[]; sameSuit: boolean };
type RoundResult = { round: number; phase: number; endedById: string; scores: Array<{ userId: string; penalty: number; totalPenalty: number }> };
type FinalPlacement = { userId: string; rank: number; totalPenalty: number };
type RecentGameAction = { commandId: string; userId: string; type: string; version: number; createdAt: string };
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
  const response = await fetch(`${API_URL}${path}`, { credentials: "include", headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers }, ...options });
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

  useEffect(() => { api<{ user: User }>("/auth/me").then((result) => setUser(result.user)).catch(() => undefined).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    if (!user) return;
    const live = io(`${API_URL}/realtime`, { withCredentials: true, transports: ["websocket"] });
    live.on("realtime:connected", () => { setConnected(true); setSocket(live); }); live.on("disconnect", () => { setConnected(false); setSocket(null); });
    live.on("lobby:update", (value: Lobby) => setLobby(value)); live.on("game:update", (value: Game) => setGame(value));
    live.on("lobby:deleted", () => { setLobby(null); setGame(null); setError("Die Lobby wurde wegen Inaktivität geschlossen."); });
    return () => { live.disconnect(); setSocket(null); setConnected(false); };
  }, [user]);
  useEffect(() => { if (!socket || !lobby?.code) return; socket.emit("lobby:watch", { code: lobby.code }); return () => { socket.emit("lobby:unwatch", { code: lobby.code }); }; }, [socket, lobby?.code]);

  const openLobby = async (code: string) => { const value = await api<Lobby>(`/lobbies/${code}`); setLobby(value); if (value.status === "ACTIVE") setGame(await api<Game>(`/lobbies/${code}/game`)); };
  const leaveLobby = async () => { if (!lobby) return; await api(`/lobbies/${lobby.code}/leave`, { method: "POST", body: "{}" }); setLobby(null); setGame(null); };
  const logout = async () => { await api("/auth/logout", { method: "POST", body: "{}" }); setUser(null); setLobby(null); setGame(null); };

  if (loading) return <main className="portrait-view centered"><p className="brand">Escalera</p></main>;
  if (!user) return <AccessView error={error} setError={setError} onAccess={setUser} />;
  if (game && lobby && lobby.status !== "OPEN") return <GameView user={user} lobby={lobby} game={game} connected={connected} onGame={setGame} onLeave={leaveLobby} />;
  if (lobby) return <LobbyView user={user} lobby={lobby} connected={connected} error={error} setError={setError} onLeave={leaveLobby} />;
  return <LobbyListView user={user} connected={connected} error={error} setError={setError} onLobby={openLobby} onLogout={logout} />;
}

function AccessView({ error, setError, onAccess }: { error: string; setError: (value: string) => void; onAccess: (user: User) => void }) {
  const [username, setUsername] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(""); try { onAccess((await api<{ user: User }>("/auth/access", { method: "POST", body: JSON.stringify({ username, password }) })).user); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } };
  return <main className="portrait-view login-view"><Orientation portrait /><section className="surface login-card"><div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><span className="brand-suit suit-red">♥</span><h1 className="brand">Escalera</h1><span className="brand-suit">♣</span><span className="brand-suit suit-red">♦</span></div><form onSubmit={submit}><label>Benutzername<input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={24} autoComplete="username" required /></label><label>Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} type="password" autoComplete="current-password" required /></label>{error && <p className="error" role="alert">{error}</p>}<button className="button-primary" disabled={busy}>{busy ? "Einen Moment …" : "Anmelden / Registrieren"}</button></form><p className="login-note muted">Ist dein Name noch frei, wird er mit diesem Passwort registriert. Ohne das Passwort kann der Name nicht wiederhergestellt werden.</p></section></main>;
}

function LobbyListView({ user, connected, error, setError, onLobby, onLogout }: { user: User; connected: boolean; error: string; setError: (value: string) => void; onLobby: (code: string) => Promise<void>; onLogout: () => Promise<void> }) {
  const [lobbies, setLobbies] = useState<Lobby[]>([]); const [search, setSearch] = useState(""); const [dialog, setDialog] = useState(false); const [busy, setBusy] = useState(false);
  const refresh = async (query = search) => { try { setLobbies(await api<Lobby[]>(`/lobbies?search=${encodeURIComponent(query)}`)); } catch (reason) { setError(message(reason)); } };
  useEffect(() => { void refresh(""); const timer = window.setInterval(() => void refresh(search), 10_000); return () => window.clearInterval(timer); }, []);
  const join = async (code: string) => { setBusy(true); setError(""); try { await api(`/lobbies/${code}/join`, { method: "POST", body: "{}" }); await onLobby(code); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } };
  return <main className="portrait-view lobby-list-view"><Orientation portrait /><header className="app-header"><button className="button-quiet" onClick={() => void onLogout()}>Logout</button><h1 className="brand brand-small">Escalera</h1><span className="profile-icon" aria-label="Profil">{user.username[0].toUpperCase()}</span></header><section className="lobby-list-content"><div className="welcome-row"><h2 className="welcome">Willkommen, {user.username}</h2><Connection connected={connected} /></div><form className="lobby-tools" onSubmit={(event) => { event.preventDefault(); void refresh(); }}><input aria-label="Lobbys durchsuchen" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Code oder Gastgeber" /><button className="button-icon" aria-label="Suchen">⌕</button><button type="button" className="button-primary create-button" onClick={() => setDialog(true)}>+ Lobby</button></form>{error && <p className="error">{error}</p>}<section className="surface lobby-browser"><div className="list-title"><h3>Offene Lobbys</h3><span className="badge">{lobbies.length}</span></div><div className="lobby-scroll">{lobbies.length ? lobbies.map((entry) => <article className="surface lobby-card" key={entry.code}><div className="lobby-card-info"><strong>{entry.code}</strong><div className="lobby-meta"><span className="lobby-pill">{entry.players.length}/{entry.settings.maxPlayers} Spieler</span><span className="lobby-pill">Erstellt von {entry.host.username}</span></div></div><button className="join-button" disabled={busy} onClick={() => void join(entry.code)}>Beitreten</button></article>) : <div className="empty-state"><strong>Noch keine Lobby offen.</strong><span className="muted">Erstelle die erste Runde.</span></div>}</div></section></section>{dialog && <LobbySettingsDialog onClose={() => setDialog(false)} onCreated={onLobby} setError={setError} />}</main>;
}

function LobbySettingsDialog({ onClose, onCreated, setError, lobby }: { onClose: () => void; onCreated?: (code: string) => Promise<void>; setError: (value: string) => void; lobby?: Lobby }) {
  const initial = lobby?.settings ?? { maxPlayers: 4, jokersPerPlayer: 1, maxTurnSeconds: 60, streetsRequireSameSuit: true, confirmTurnEnd: true };
  const [busy, setBusy] = useState(false); const [settings, setSettings] = useState({ ...initial, maxTurnSeconds: initial.maxTurnSeconds ?? 60 });
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); try { const saved = await api<Lobby>(lobby ? `/lobbies/${lobby.code}/settings` : "/lobbies", { method: "POST", body: JSON.stringify(settings) }); onClose(); if (!lobby) await onCreated?.(saved.code); } catch (reason) { setError(message(reason)); } finally { setBusy(false); } };
  return <div className="dialog-backdrop" role="presentation"><section className="surface dialog"><div className="dialog-title"><h2>{lobby ? "Einstellungen" : "Lobby erstellen"}</h2><button className="button-icon" onClick={onClose} aria-label="Schließen">×</button></div><form onSubmit={submit} className="settings-form"><label>Maximale Spieler<select value={settings.maxPlayers} onChange={(event) => setSettings({ ...settings, maxPlayers: Number(event.target.value) })}>{[2,3,4,5,6].map((value) => <option key={value}>{value}</option>)}</select></label><label>Joker pro Spieler<select value={settings.jokersPerPlayer} onChange={(event) => setSettings({ ...settings, jokersPerPlayer: Number(event.target.value) })}>{[0,1,2,3,4,5,6].map((value) => <option key={value}>{value}</option>)}</select></label><label>Zeit pro Zug<select value={settings.maxTurnSeconds} onChange={(event) => setSettings({ ...settings, maxTurnSeconds: Number(event.target.value) })}>{[30,45,60,90,120,180].map((value) => <option key={value} value={value}>{value} Sekunden</option>)}</select></label><button className="button-primary" disabled={busy}>{busy ? "Speichere …" : lobby ? "Speichern" : "Lobby erstellen"}</button></form></section></div>;
}

function LobbyView({ user, lobby, connected, error, setError, onLeave }: { user: User; lobby: Lobby; connected: boolean; error: string; setError: (value: string) => void; onLeave: () => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const self = lobby.players.find((player) => player.user.id === user.id); const isHost = lobby.host.id === user.id;
  const action = async (path: string) => { setError(""); try { await api(`/lobbies/${lobby.code}/${path}`, { method: "POST", body: "{}" }); } catch (reason) { setError(message(reason)); } };
  return <main className="portrait-view lobby-view"><Orientation portrait /><header className="lobby-header"><div><p className="overline">Lobby</p><h1 className="lobby-code">{lobby.code}</h1></div><div className="lobby-status">{isHost && <button className="button-quiet" onClick={() => setEditing(true)}>Einstellungen</button>}<Connection connected={connected} /></div></header><section className="setting-badges"><span className="badge">{lobby.settings.maxPlayers} Spieler</span><span className="badge">{lobby.settings.jokersPerPlayer} Joker</span><span className="badge">{lobby.settings.maxTurnSeconds ?? "∞"} Sek.</span><span className="badge">Straße {lobby.settings.streetsRequireSameSuit ? "mit Zeichen" : "frei"}</span><span className="badge">Bestätigung {lobby.settings.confirmTurnEnd ? "an" : "aus"}</span></section><section className="surface members-panel"><div className="list-title"><h2>Spieler</h2><span>{lobby.players.length}/{lobby.settings.maxPlayers}</span></div><div className="member-list">{lobby.players.map((player) => <article className={`member-card ${player.ready ? "is-ready" : "is-waiting"} ${player.connected ? "" : "is-offline"}`} key={player.user.id}><span className="profile-icon">{player.user.username[0].toUpperCase()}</span><div><strong>{player.user.username}</strong><span>{player.user.id === lobby.host.id ? "♛ Gastgeber" : "Spieler"} · {player.connected ? "Online" : "Offline"}</span></div><span className="member-state">{player.ready ? "✓ Bereit" : "○ Wartet"}</span></article>)}</div></section>{error && <p className="error">{error}</p>}<footer className="lobby-actions"><button className="button-danger" onClick={() => void onLeave()}>Verlassen</button><button onClick={() => void action(self?.ready ? "not-ready" : "ready")}>{self?.ready ? "Nicht bereit" : "Bereit"}</button></footer>{editing && <LobbySettingsDialog lobby={lobby} onClose={() => setEditing(false)} setError={setError} />}</main>;
}

function GameView({ user, lobby, game, connected, onGame, onLeave }: { user: User; lobby: Lobby; game: Game; connected: boolean; onGame: (game: Game) => void; onLeave: () => Promise<void> }) {
  const [menu, setMenu] = useState(false); const [scoreboard, setScoreboard] = useState(false); const [sort, setSort] = useState<"rank" | "suit">("rank");
  const [selected, setSelected] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [actionError, setActionError] = useState("");
  const [dismissedRound, setDismissedRound] = useState<number | null>(null);
  const opponents = useMemo(() => game.state.players.filter((player) => player.userId !== user.id).map((player) => { const member = lobby.players.find((entry) => entry.user.id === player.userId); return { ...player, name: member?.user.username ?? "Spieler", connected: member?.connected ?? false }; }).sort((a, b) => Number(a.userId === game.state.activePlayerId) - Number(b.userId === game.state.activePlayerId)), [game, lobby, user]);
  const hand = useMemo(() => [...game.state.ownHand].sort((a, b) => cardSort(a, b, sort)), [game.state.ownHand, sort]);
  useEffect(() => setSelected((current) => current.filter((id) => game.state.ownHand.some((card) => card.id === id))), [game.state.ownHand]);
  const self = game.state.players.find((player) => player.userId === user.id)!;
  const canPlay = game.state.turn.canAct && game.state.turn.hasDrawn && !busy;
  const act = async (path: string, body?: object) => {
    setBusy(true); setActionError("");
    try {
      const result = await api<Game>(`/games/${lobby.code}/${path}`, { method: "POST", body: JSON.stringify({ commandId: crypto.randomUUID(), expectedVersion: game.version, payload: body ?? {} }) });
      onGame(result); setSelected([]);
    } catch (reason) {
      if (reason instanceof ApiError && typeof reason.body === "object" && reason.body && "state" in reason.body && "version" in reason.body) onGame(reason.body as Game);
      setActionError(message(reason));
    } finally { setBusy(false); }
  };
  const toggleCard = (cardId: string) => setSelected((current) => current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId]);
  const submitPhase = () => {
    try { void act("phase", { combinations: phaseCombinations(hand.filter((card) => selected.includes(card.id)), game.state.phase) }); }
    catch (reason) { setActionError(message(reason)); }
  };
  const showRoundResult = game.state.status === "ACTIVE" && game.state.lastRoundResult && dismissedRound !== game.state.lastRoundResult.round;
  return <main className="landscape-view game-view">
    <Orientation landscape />
    <header className="game-top"><button className="button-icon" aria-label="Spielmenü" onClick={() => setMenu(true)}>☰</button><div className="opponent-row">{opponents.map((player) => <article className={`opponent-card ${player.userId === game.state.activePlayerId ? "is-active" : ""} ${player.connected ? "" : "is-offline"}`} key={player.userId}><strong>{player.name}</strong><span>{player.connected ? `${player.handCount} Karten` : "Offline · wird übersprungen"}</span><span>{player.coins} Münzen · {player.totalPenalty} P</span></article>)}</div><Connection connected={connected} /></header>
    <section className="game-board"><button className="game-pile draw-pile" disabled={!game.state.turn.canAct || game.state.turn.hasDrawn || busy} onClick={() => void act("draw", { source: "draw" })}><span>Nachziehen</span><strong>{game.state.drawPileCount}</strong></button><div className="meld-zone">{game.state.melds.length ? game.state.melds.map((meld) => <article className="meld-card" key={meld.id}><div><strong>{meld.type === "group" ? "Gruppe" : "Straße"}</strong><span>{meld.cards.map(cardLabel).join(" · ")}</span></div><button disabled={!canPlay || !self.phaseLaid || selected.length !== 1} onClick={() => void act(`melds/${meld.id}/cards`, { cardId: selected[0] })}>Anlegen</button></article>) : <div className="empty-meld">Meld-Zone</div>}</div><div className="discard-area"><button className="game-pile discard-pile" disabled={!game.state.discardTop || !game.state.turn.canAct || game.state.turn.hasDrawn || busy} onClick={() => void act("draw", { source: "discard" })}><span>Ablage</span><strong>{game.state.discardTop ? cardLabel(game.state.discardTop) : "Leer"}</strong></button>{game.state.discardOffer && <button className="buy-button" disabled={busy} onClick={() => void act("buy")}>Kaufen · 1 Münze</button>}</div></section>
    <section className="player-hand"><div className="hand-toolbar"><div className="turn-label">{game.state.status === "FINISHED" ? "Partie beendet" : game.state.activePlayerId === user.id ? `Dein Zug · Phase ${game.state.phase}` : `Runde ${game.state.round} · Phase ${game.state.phase}`}</div><TurnCountdown deadlineAt={game.state.turn.deadlineAt} finished={game.state.status === "FINISHED"} /><div className="turn-actions">{!self.phaseLaid ? <button disabled={!canPlay || selected.length < 3} onClick={submitPhase}>Phase auslegen</button> : <button disabled={!canPlay || selected.length < 3} onClick={() => void act("melds", { cardIds: selected })}>Kombi auslegen</button>}<button className="button-primary" disabled={!canPlay || selected.length !== 1} onClick={() => void act("discard", { cardId: selected[0] })}>Abwerfen</button></div>{actionError && <span className="game-error" role="alert">{actionError}</span>}</div><div className="hand-cards">{hand.map((card, index) => <button type="button" aria-pressed={selected.includes(card.id)} onClick={() => toggleCard(card.id)} className={`playing-card ${isRed(card) ? "red-card" : ""} ${selected.includes(card.id) ? "is-selected" : ""}`} style={{ "--card-index": index } as React.CSSProperties} key={card.id}><strong>{cardLabel(card)}</strong></button>)}</div></section>
    {menu && <aside className="game-menu surface"><div className="dialog-title"><h2>Spielmenü</h2><button className="button-icon" onClick={() => setMenu(false)}>×</button></div><button onClick={() => { setMenu(false); setScoreboard(true); }}>Scoreboard</button><button onClick={() => setSort(sort === "rank" ? "suit" : "rank")}>Hand: {sort === "rank" ? "Wert" : "Zeichen"}</button><button>Meine Statistiken</button><button>Spielerprofile</button><button className="button-danger leave-game" onClick={() => void onLeave()}>Lobby verlassen</button></aside>}
    {scoreboard && <Scoreboard game={game} lobby={lobby} onClose={() => setScoreboard(false)} />}
    {showRoundResult && <RoundResultOverlay result={game.state.lastRoundResult!} nextPhase={game.state.phase} lobby={lobby} onContinue={() => setDismissedRound(game.state.lastRoundResult!.round)} />}
    {game.state.status === "FINISHED" && <FinalResultOverlay placements={game.state.placements} lobby={lobby} onLeave={onLeave} />}
  </main>;
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

function Orientation({ portrait, landscape }: { portrait?: boolean; landscape?: boolean }) { return <div className="orientation-notice"><div><div className="rotate-icon">↻</div><h2>Gerät drehen</h2><p className="muted">Diese Ansicht ist für {portrait ? "Hochformat" : landscape ? "Querformat" : "eine andere Ausrichtung"} gestaltet.</p></div></div>; }
function Connection({ connected }: { connected: boolean }) { return <span className={`connection ${connected ? "online" : ""}`}>{connected ? "Online" : "Verbinde"}</span>; }
function suitSymbol(suit: string) { return ({ clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" } as Record<string, string>)[suit] ?? "?"; }
function cardLabel(card: Card) { return card.kind === "joker" ? "Joker" : `${card.rank} ${suitSymbol(card.suit)}`; }
function isRed(card: Card) { return card.kind === "standard" && (card.suit === "hearts" || card.suit === "diamonds"); }
function cardSort(a: Card, b: Card, mode: "rank" | "suit") { const rank = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"]; const av = a.kind === "joker" ? 99 : mode === "rank" ? rank.indexOf(a.rank) : a.suit.localeCompare(b.kind === "standard" ? b.suit : "zz"); const bv = b.kind === "joker" ? 99 : mode === "rank" ? rank.indexOf(b.rank) : 0; return typeof av === "number" && typeof bv === "number" ? av - bv : 0; }
function phaseCombinations(cards: Card[], phase: number) {
  if (phase === 7) return [cards.map((card) => card.id)];
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
  return combinations.map((combination) => combination.map((card) => card.id));
}
function message(reason: unknown) { return reason instanceof Error ? reason.message : "Aktion konnte nicht ausgeführt werden."; }
