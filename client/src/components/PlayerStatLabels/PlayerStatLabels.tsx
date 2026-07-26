export function PlayerStatLabels({ coins, cards, penalty }: { coins: number; cards: number; penalty?: number }) {
  return <span className="player-stat-labels" aria-label={`${coins} Münzen, ${cards} Karten${penalty === undefined ? "" : `, ${penalty} Strafpunkte`}`}>
    <span className="player-stat player-stat-coins"><b className="player-stat-value">{coins}</b><span className="player-stat-icon" aria-hidden="true">◉</span></span>
    <span className="player-stat player-stat-cards"><b className="player-stat-value">{cards}</b><span className="player-stat-icon" aria-hidden="true">▣</span></span>
    {penalty !== undefined && <span className="player-stat player-stat-penalty"><b className="player-stat-value">{penalty}</b><span className="player-stat-icon" aria-hidden="true">⚑</span></span>}
  </span>;
}
