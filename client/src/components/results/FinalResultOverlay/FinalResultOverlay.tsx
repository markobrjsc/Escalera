import { playerName } from "../../../lib/players.js";
import type { FinalPlacement, Lobby } from "../../../lib/types.js";

export function FinalResultOverlay({ placements, lobby, onLeave }: { placements: FinalPlacement[]; lobby: Lobby; onLeave: () => Promise<boolean> }) {
  return <div className="game-result-overlay final-result"><section className="surface result-panel"><div><p className="overline">Alle sieben Phasen gespielt</p><h2>Partie beendet</h2></div><div className="result-table">{placements.map((placement) => <div className={`result-row placement-${placement.rank}`} key={placement.userId}><strong>#{placement.rank} {playerName(lobby, placement.userId)}</strong><span>{placement.compensatedPenalty} kompensierte Strafpunkte</span><b>{placement.totalPenalty} Punkte</b></div>)}</div><button className="button-primary" onClick={() => void onLeave()}>Zur Lobbyliste</button></section></div>;
}
