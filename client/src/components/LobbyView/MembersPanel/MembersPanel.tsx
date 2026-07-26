import { MemberCard } from "./MemberCard/MemberCard.js";
import { MemberSlotEmpty } from "./MemberSlotEmpty/MemberSlotEmpty.js";
import type { Lobby } from "../../../lib/types.js";

// The players panel: the roster of joined members plus placeholder seats for the
// open slots. all-ready highlights the list when the game can start.
export function MembersPanel({ players, maxPlayers, hostId, allReady, emptySeats, onProfile }: { players: Lobby["players"]; maxPlayers: number; hostId: string; allReady: boolean; emptySeats: unknown[]; onProfile: (userId: string) => void }) {
  return <section className="surface members-panel">
    <div className="list-title lobby-player-title"><h2>Spieler</h2><span>{players.length}/{maxPlayers}</span></div>
    <div className={`member-list ${allReady ? "all-ready" : ""}`}>
      {players.map((player) => <MemberCard key={player.user.id} player={player} hostId={hostId} onProfile={onProfile} />)}
      {emptySeats.map((_, index) => <MemberSlotEmpty key={`empty-${index}`} />)}
    </div>
  </section>;
}
