import { playerName } from "../../../../lib/players.js";
import type { Lobby, RoundResult } from "../../../../lib/types.js";
import type { buildScoreboardRows } from "../../../../scoreboard.js";

type ScoreRow = ReturnType<typeof buildScoreboardRows>[number];

// The per-round penalty history table inside the scoreboard.
export function ScoreHistory({ rounds, rows, lobby }: { rounds: RoundResult[]; rows: ScoreRow[]; lobby: Lobby }) {
  return <section className="score-history" aria-labelledby="score-history-title"><div className="score-history-heading"><h3 id="score-history-title">Strafen je Runde</h3><span>{rounds.length} von 7 abgeschlossen</span></div>{rounds.length ? <div className="score-history-scroll" tabIndex={0}><table><caption className="sr-only">Strafpunkte aller Spieler nach Runde</caption><thead><tr><th scope="col">Spieler</th>{rounds.map((round) => <th scope="col" title={`Runde ${round.round}, Phase ${round.phase}`} key={round.round}><span>R{round.round}</span><small>Phase {round.phase}</small></th>)}<th scope="col">Gesamt</th></tr></thead><tbody>{rows.map((row) => <tr key={row.userId}><th scope="row">{playerName(lobby, row.userId)}</th>{row.penalties.map((penalty, index) => <td key={`${row.userId}-${rounds[index].round}`}>{penalty === null ? <span aria-label="Keine Wertung">—</span> : penalty === 0 ? "0" : `+${penalty}`}</td>)}<td><strong>{row.totalPenalty}</strong></td></tr>)}</tbody></table></div> : <p className="score-history-empty">Noch keine Runde abgeschlossen.</p>}</section>;
}
