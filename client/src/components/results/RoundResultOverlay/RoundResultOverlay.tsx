import { playerName } from "../../../lib/players.js";
import type { Lobby, RoundResult } from "../../../lib/types.js";

export function RoundResultOverlay({ result, nextPhase, lobby, onContinue }: { result: RoundResult; nextPhase: number; lobby: Lobby; onContinue: () => void }) {
  return <div className="game-result-overlay"><section className="surface result-panel"><div><p className="overline">Phase {result.phase} geschafft von {playerName(lobby, result.endedById)}</p><h2>Runde {result.round} beendet</h2></div><div className="result-table">{[...result.scores].sort((a, b) => a.totalPenalty - b.totalPenalty).map((score) => <div className="result-row" key={score.userId}><strong>{playerName(lobby, score.userId)}</strong><span>+{score.penalty} Punkte</span><b>{score.totalPenalty} P gesamt</b></div>)}</div><button className="button-primary" onClick={onContinue}>Phase {nextPhase} starten</button></section></div>;
}
