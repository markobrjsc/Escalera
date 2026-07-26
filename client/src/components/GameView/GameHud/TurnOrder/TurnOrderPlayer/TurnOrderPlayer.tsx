import { Avatar } from "../../../../Avatar/Avatar.js";
import { PlayerStatLabels } from "../../../../PlayerStatLabels/PlayerStatLabels.js";
import type { AnchorRef, User } from "../../../../../lib/types.js";

type Seat = { userId: string; user: User; connected: boolean; coins: number };

// One opponent seat in the turn-order strip. The seatRef is the flight anchor
// dealt/discarded cards fly to.
export function TurnOrderPlayer({ player, index, cards, seatRef, onProfile }: { player: Seat; index: number; cards: number; seatRef: AnchorRef; onProfile: (userId: string) => void }) {
  return <article className={`turn-order-player ${player.connected ? "" : "is-offline"}`} ref={seatRef}><span className="turn-position">{index + 1}</span><Avatar user={player.user} onClick={() => onProfile(player.userId)} /><div><strong>{player.user.username}</strong><PlayerStatLabels coins={player.coins} cards={cards} /></div></article>;
}
