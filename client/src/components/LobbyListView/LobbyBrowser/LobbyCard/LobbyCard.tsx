import type { Lobby } from "../../../../lib/types.js";

// One open lobby in the browser list. --lobby-index staggers the entry animation.
export function LobbyCard({ entry, index, busy, onJoin }: { entry: Lobby; index: number; busy: boolean; onJoin: (code: string) => void }) {
  return <article className="surface lobby-card" style={{ "--lobby-index": index } as React.CSSProperties}>
    <div className="lobby-card-info"><strong>{entry.name}</strong><div className="lobby-meta"><span className="lobby-pill">{entry.code}</span><span className="lobby-pill">{entry.players.length}/{entry.settings.maxPlayers} Spieler</span><span className="lobby-pill">Erstellt von {entry.host.username}</span></div></div>
    <button className="join-button" disabled={busy} onClick={() => onJoin(entry.code)}>Beitreten</button>
  </article>;
}
