import { EmptyState } from "../../EmptyState/EmptyState.js";
import { Badge } from "../../Badge/Badge.js";
import { LobbyCard } from "./LobbyCard/LobbyCard.js";
import type { Lobby } from "../../../lib/types.js";

// The framed, scrollable list of open lobbies with its title, counter badge and
// loading / empty placeholders.
export function LobbyBrowser({ lobbies, loaded, busy, onJoin }: { lobbies: Lobby[]; loaded: boolean; busy: boolean; onJoin: (code: string) => void }) {
  return <section className="surface lobby-browser" aria-busy={!loaded}>
    <div className="list-title"><h3>Offene Lobbys</h3><Badge>{loaded ? lobbies.length : "…"}</Badge></div>
    <div className="lobby-scroll">{!loaded
      ? <EmptyState className="lobby-loading" role="status" title="Lobbys werden gemischt …" hint="Einen Moment bitte." />
      : lobbies.length
        ? lobbies.map((entry, index) => <LobbyCard key={entry.code} entry={entry} index={index} busy={busy} onJoin={onJoin} />)
        : <EmptyState title="Noch keine Lobby offen." hint="Erstelle die erste Runde." />}</div>
  </section>;
}
