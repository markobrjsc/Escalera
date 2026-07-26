import { Avatar } from "../../../Avatar/Avatar.js";
import { PlayerStatLabels } from "../../../PlayerStatLabels/PlayerStatLabels.js";
import { TurnCountdown } from "../TurnCountdown/TurnCountdown.js";
import type { AnchorRef, PublicUser } from "../../../../lib/types.js";

type Seat = { userId: string; user: PublicUser; coins: number; totalPenalty: number };

// The highlighted card for the player whose turn it currently is, with the
// turn countdown.
export function ActivePlayerHud({ player, isSelf, cards, seatRef, onProfile, opensAt, deadlineAt, finished }: { player: Seat; isSelf: boolean; cards: number; seatRef: AnchorRef; onProfile: (userId: string) => void; opensAt: string | null; deadlineAt: string | null; finished: boolean }) {
  return <section className={`active-player-hud ${isSelf ? "is-self" : ""}`} ref={seatRef}><Avatar user={player.user} onClick={() => onProfile(player.userId)} /><div><span className="hud-kicker">{isSelf ? "Du bist am Zug" : "Am Zug"}</span><strong>{player.user.username}</strong><PlayerStatLabels coins={player.coins} cards={cards} penalty={player.totalPenalty} /></div><TurnCountdown opensAt={opensAt} deadlineAt={deadlineAt} finished={finished} /></section>;
}
