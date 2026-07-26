import { TurnOrderPlayer } from "./TurnOrderPlayer/TurnOrderPlayer.js";
import type { Anchor, User } from "../../../../lib/types.js";

type Seat = { userId: string; user: User; connected: boolean; coins: number; handCount: number };

// The ordered list of opponents waiting for their turn.
export function TurnOrder({ players, seatRef, shownCards, onProfile }: { players: Seat[]; seatRef: Anchor; shownCards: (player: { userId: string; handCount: number }) => number; onProfile: (userId: string) => void }) {
  return <section className="turn-order" aria-label="Zugreihenfolge"><span className="hud-kicker">Reihenfolge</span>{players.map((player, index) => <TurnOrderPlayer key={player.userId} player={player} index={index} cards={shownCards(player)} seatRef={seatRef(player.userId)} onProfile={onProfile} />)}</section>;
}
