import { buildScoreboardRows } from "../../../scoreboard.js";
import { playerName } from "../../../lib/players.js";
import type { Game, Lobby } from "../../../lib/types.js";
import { ScoreHistory } from "./ScoreHistory/ScoreHistory.js";

export function Scoreboard({ game, lobby, onClose }: { game: Game; lobby: Lobby; onClose: () => void }) {
  const rounds = [...game.state.roundResults].sort((a, b) => a.round - b.round);
  const rows = buildScoreboardRows(rounds, game.state.players);
  return <div className="game-result-overlay"><section className="surface result-panel scoreboard-panel"><div className="dialog-title"><div><p className="overline">Runde {game.state.round} · Phase {game.state.phase}</p><h2>Scoreboard</h2></div><button className="button-icon" onClick={onClose}>×</button></div><div className="result-table scoreboard-current">{rows.map((row) => { const player = game.state.players.find((entry) => entry.userId === row.userId)!; return <div className="result-row" key={row.userId}><strong>{playerName(lobby, row.userId)}</strong><span>{player.handCount} Karten</span><span>{player.coins} Münzen</span><b>{row.totalPenalty} P</b></div>; })}</div><ScoreHistory rounds={rounds} rows={rows} lobby={lobby} /></section></div>;
}
