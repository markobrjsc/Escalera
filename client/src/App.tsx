import { FormEvent, useEffect, useMemo, useState } from "react";
import { io, Socket } from "socket.io-client";

const API_URL = `${window.location.protocol}//${window.location.hostname}:3000`;

type User = { id: string; username: string; avatarKey: string | null; tutorialCompleted: boolean };
type Lobby = {
  code: string;
  status: "OPEN" | "ACTIVE" | "CLOSED";
  host: Pick<User, "id" | "username">;
  settings: { maxPlayers: number; jokersPerPlayer: number; maxTurnSeconds: number; streetsRequireSameSuit: boolean };
  players: Array<{ user: User; ready: boolean }>;
};
type Card = { id: string; kind: "joker" } | { id: string; kind: "standard"; rank: string; suit: string; deck: number };
type Game = {
  version: number;
  state: {
    phase: number;
    activePlayerId: string;
    drawPileCount: number;
    discardTop: Card;
    players: Array<{ userId: string; handCount: number; coins: number }>;
    ownHand: Card[];
  };
};

async function api<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: { ...(options.body ? { "content-type": "application/json" } : {}), ...options.headers },
    ...options
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? "Etwas ist schiefgelaufen.");
  }
  return response.status === 204 ? (undefined as T) : (response.json() as Promise<T>);
}

function cardLabel(card: Card) {
  return card.kind === "joker" ? "Joker" : `${card.rank} ${suitSymbol(card.suit)}`;
}

function suitSymbol(suit: string) {
  return ({ clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" } as Record<string, string>)[suit] ?? "?";
}

function runsAsInstalledApp() {
  const mobileNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: fullscreen)").matches || mobileNavigator.standalone === true;
}

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    api<{ user: User }>("/auth/me").then(({ user: currentUser }) => setUser(currentUser)).catch(() => undefined).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    const nextSocket = io(`${API_URL}/realtime`, { withCredentials: true, transports: ["websocket"] });
    nextSocket.on("connect", () => setConnected(true));
    nextSocket.on("disconnect", () => setConnected(false));
    nextSocket.on("lobby:update", (update: Lobby) => setLobby(update));
    nextSocket.on("game:update", (update: Game) => setGame(update));
    setSocket(nextSocket);
    return () => {
      nextSocket.disconnect();
      setSocket(null);
      setConnected(false);
    };
  }, [user]);

  useEffect(() => {
    if (!socket || !lobby?.code) return;
    socket.emit("lobby:watch", { code: lobby.code });
    return () => { socket.emit("lobby:unwatch", { code: lobby.code }); };
  }, [socket, lobby?.code]);

  const selfPlayer = useMemo(() => lobby?.players.find((player) => player.user.id === user?.id), [lobby, user]);

  const openLobby = async (code: string) => {
    const nextLobby = await api<Lobby>(`/lobbies/${code}`);
    setLobby(nextLobby);
    if (nextLobby.status === "ACTIVE") setGame(await api<Game>(`/lobbies/${code}/game`));
  };

  const updateReady = async () => {
    if (!lobby || !selfPlayer) return;
    setError("");
    try {
      await api(`/lobbies/${lobby.code}/${selfPlayer.ready ? "not-ready" : "ready"}`, { method: "POST", body: "{}" });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Bereit-Status konnte nicht geändert werden."); }
  };

  const startGame = async () => {
    if (!lobby) return;
    setError("");
    try { await api(`/lobbies/${lobby.code}/start`, { method: "POST", body: "{}" }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Partie konnte nicht gestartet werden."); }
  };

  if (loading) return <main className="app-shell"><p>Escalera wird vorbereitet …</p></main>;
  if (!user) return <AccessScreen onAccess={setUser} onError={setError} error={error} />;
  if (game && lobby?.status === "ACTIVE") return <GameTable user={user} lobby={lobby} game={game} connected={connected} onLeave={() => { setLobby(null); setGame(null); }} />;
  if (lobby) return <LobbyScreen user={user} lobby={lobby} connected={connected} error={error} onReady={updateReady} onStart={startGame} onLeave={() => setLobby(null)} />;
  return <HomeScreen user={user} connected={connected} onLobby={openLobby} onUser={setUser} onError={setError} error={error} />;
}

function AccessScreen({ onAccess, onError, error }: { onAccess: (user: User) => void; onError: (error: string) => void; error: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); onError("");
    try { onAccess((await api<{ user: User }>("/auth/access", { method: "POST", body: JSON.stringify({ username, password }) })).user); }
    catch (reason) { onError(reason instanceof Error ? reason.message : "Anmeldung nicht möglich."); }
    finally { setBusy(false); }
  };
  return <main className="app-shell"><section className="panel access-panel"><p className="eyebrow">Escalera</p><h1>Gemeinsam spielen.</h1><p className="lead">Name neu? Dann wird dein Konto direkt erstellt.</p><form onSubmit={submit}><label>Benutzername<input value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={24} required autoComplete="username" /></label><label>Passwort<input value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} required type="password" autoComplete="current-password" /></label>{error && <p className="error" role="alert">{error}</p>}<button disabled={busy}>{busy ? "Bitte warten …" : "Anmelden oder registrieren"}</button></form><p className="hint">Passwörter können ohne E-Mail-Adresse nicht zurückgesetzt werden.</p></section></main>;
}

function HomeScreen({ user, connected, onLobby, onUser, onError, error }: { user: User; connected: boolean; onLobby: (code: string) => Promise<void>; onUser: (user: User) => void; onError: (error: string) => void; error: string }) {
  const [code, setCode] = useState(""); const [creating, setCreating] = useState(false); const [joining, setJoining] = useState(false);
  const create = async () => { setCreating(true); onError(""); try { const lobby = await api<Lobby>("/lobbies", { method: "POST", body: JSON.stringify({ maxPlayers: 4, jokersPerPlayer: 1, maxTurnSeconds: 60, streetsRequireSameSuit: true }) }); await onLobby(lobby.code); } catch (reason) { onError(reason instanceof Error ? reason.message : "Lobby konnte nicht erstellt werden."); } finally { setCreating(false); } };
  const join = async (event: FormEvent) => { event.preventDefault(); setJoining(true); onError(""); try { await api(`/lobbies/${code.toUpperCase()}/join`, { method: "POST", body: "{}" }); await onLobby(code.toUpperCase()); } catch (reason) { onError(reason instanceof Error ? reason.message : "Lobby konnte nicht betreten werden."); } finally { setJoining(false); } };
  const uploadAvatar = async (event: FormEvent<HTMLInputElement>) => { const file = event.currentTarget.files?.[0]; if (!file) return; onError(""); const form = new FormData(); form.append("file", file); try { const response = await fetch(`${API_URL}/profile/avatar`, { method: "POST", credentials: "include", body: form }); const data = await response.json(); if (!response.ok) throw new Error(data.message); onUser(data.user); } catch (reason) { onError(reason instanceof Error ? reason.message : "Profilbild konnte nicht gespeichert werden."); } };
  return <main className="app-shell"><section className="home"><header className="topbar"><div><p className="eyebrow">Escalera</p><h1>Hallo, {user.username}</h1></div><Connection connected={connected} /></header><div className="grid"><article className="panel"><h2>Neue Lobby</h2><p>Bis zu vier Spieler, ein Joker pro Spieler und 60 Sekunden pro Zug.</p><button onClick={create} disabled={creating}>{creating ? "Lobby wird erstellt …" : "Lobby erstellen"}</button></article><article className="panel"><h2>Lobby beitreten</h2><form onSubmit={join}><label>Lobby-Code<input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="A1B2C3" maxLength={6} required /></label><button disabled={joining}>{joining ? "Beitreten …" : "Beitreten"}</button></form></article><article className="panel profile"><h2>Profil</h2><div className="avatar">{user.username.slice(0, 1).toUpperCase()}</div><label className="upload">Profilbild ändern<input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadAvatar} /></label></article></div>{error && <p className="error" role="alert">{error}</p>}<p className="hint">{runsAsInstalledApp() ? "Vollbildmodus aktiv." : "Für ein Vollbilderlebnis: Escalera zum Home-Bildschirm hinzufügen."}</p></section></main>;
}

function LobbyScreen({ user, lobby, connected, error, onReady, onStart, onLeave }: { user: User; lobby: Lobby; connected: boolean; error: string; onReady: () => void; onStart: () => void; onLeave: () => void }) {
  const isHost = lobby.host.id === user.id; const self = lobby.players.find((player) => player.user.id === user.id); const allReady = lobby.players.length >= 2 && lobby.players.every((player) => player.ready);
  return <main className="app-shell"><section className="lobby-screen"><header className="topbar"><div><button className="text-button" onClick={onLeave}>‹ Zurück</button><p className="eyebrow">Lobby-Code</p><h1 className="code">{lobby.code}</h1></div><Connection connected={connected} /></header><article className="panel"><h2>Spieler ({lobby.players.length}/{lobby.settings.maxPlayers})</h2><div className="player-list">{lobby.players.map((player) => <div className="player" key={player.user.id}><span className="avatar small">{player.user.username.slice(0, 1)}</span><span>{player.user.username}{player.user.id === lobby.host.id ? " · Gastgeber" : ""}</span><strong className={player.ready ? "ready" : "waiting"}>{player.ready ? "Bereit" : "Wartet"}</strong></div>)}</div><p className="hint">{lobby.settings.jokersPerPlayer} Joker pro Spieler · {lobby.settings.maxTurnSeconds} Sekunden pro Zug</p><div className="actions"><button onClick={onReady}>{self?.ready ? "Doch nicht bereit" : "Ich bin bereit"}</button>{isHost && <button className="secondary" onClick={onStart} disabled={!allReady}>Partie starten</button>}</div>{error && <p className="error">{error}</p>}</article></section></main>;
}

function GameTable({ user, lobby, game, connected, onLeave }: { user: User; lobby: Lobby; game: Game; connected: boolean; onLeave: () => void }) {
  const players = game.state.players.map((state) => ({ ...state, name: lobby.players.find((entry) => entry.user.id === state.userId)?.user.username ?? "Spieler" }));
  return <main className="game-shell"><header className="game-header"><button className="text-button" onClick={onLeave}>‹ Lobby</button><span>Phase {game.state.phase}</span><Connection connected={connected} /></header><section className="opponents">{players.filter((player) => player.userId !== user.id).map((player) => <div className={player.userId === game.state.activePlayerId ? "opponent active" : "opponent"} key={player.userId}><strong>{player.name}</strong><span>{player.handCount} Karten · {player.coins} Münzen</span></div>)}</section><section className="table"><div className="pile"><span>Nachziehen</span><strong>{game.state.drawPileCount}</strong></div><div className="pile discard"><span>Ablage</span><strong>{cardLabel(game.state.discardTop)}</strong></div></section><section className="hand"><p>{game.state.activePlayerId === user.id ? "Du bist am Zug" : "Warte auf den aktiven Spieler"}</p><div className="cards">{game.state.ownHand.map((card) => <article className={`card ${card.kind === "standard" && (card.suit === "hearts" || card.suit === "diamonds") ? "red" : ""}`} key={card.id}><strong>{cardLabel(card)}</strong></article>)}</div></section></main>;
}

function Connection({ connected }: { connected: boolean }) { return <span className={connected ? "connection online" : "connection"}>{connected ? "Live verbunden" : "Verbinde …"}</span>; }
