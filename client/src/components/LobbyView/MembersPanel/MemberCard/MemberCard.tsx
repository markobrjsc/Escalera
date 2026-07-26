import { Avatar } from "../../../Avatar/Avatar.js";
import type { Lobby } from "../../../../lib/types.js";

type Member = Lobby["players"][number];

// One player seat in the lobby roster: avatar, name, host/online state and a
// ready indicator.
export function MemberCard({ player, hostId, onProfile }: { player: Member; hostId: string; onProfile: (userId: string) => void }) {
  return <article className={`member-card ${player.ready ? "is-ready" : "is-waiting"} ${player.connected ? "" : "is-offline"}`}><Avatar user={player.user} onClick={() => onProfile(player.user.id)} /><div><strong>{player.user.username}</strong><span>{player.user.id === hostId ? "♛ Gastgeber" : "Spieler"} · {player.connected ? "Online" : "Offline"}</span></div><span className="member-state">{player.ready ? "✓ Bereit" : "○ Wartet"}</span></article>;
}
