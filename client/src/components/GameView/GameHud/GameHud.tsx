import { TurnOrder } from "./TurnOrder/TurnOrder.js";
import { ActivePlayerHud } from "./ActivePlayerHud/ActivePlayerHud.js";
import { PhaseHud } from "./PhaseHud/PhaseHud.js";
import type { Anchor, User } from "../../../lib/types.js";

type Seat = { userId: string; user: User; connected: boolean; coins: number; handCount: number; totalPenalty: number };

// The top bar of the gametable: turn order, the active player and the phase
// indicator, assembled from their own components.
export function GameHud({ turnOrder, activePlayer, userId, round, phase, selfPhaseLaid, opensAt, deadlineAt, finished, seatRef, shownCards, onProfile }: { turnOrder: Seat[]; activePlayer: Seat; userId: string; round: number; phase: number; selfPhaseLaid: boolean; opensAt: string | null; deadlineAt: string | null; finished: boolean; seatRef: Anchor; shownCards: (player: { userId: string; handCount: number }) => number; onProfile: (userId: string) => void }) {
  return <header className="game-hud">
    <TurnOrder players={turnOrder} seatRef={seatRef} shownCards={shownCards} onProfile={onProfile} />
    <ActivePlayerHud player={activePlayer} isSelf={activePlayer?.userId === userId} cards={shownCards(activePlayer)} seatRef={seatRef(activePlayer?.userId)} onProfile={onProfile} opensAt={opensAt} deadlineAt={deadlineAt} finished={finished} />
    <PhaseHud round={round} phase={phase} phaseLaid={selfPhaseLaid} />
  </header>;
}
