export function PlayerStatLabels({ coins, cards, penalty }: { coins: number; cards: number; penalty?: number }) {
  return <span className="player-stat-labels" aria-label={`${coins} Münzen, ${cards} Karten${penalty === undefined ? "" : `, ${penalty} Strafpunkte`}`}>
    <span className="player-stat"><b>{coins}</b><span aria-hidden="true">◉</span></span>
    <span className="player-stat"><b>{cards}</b><span aria-hidden="true">▣</span></span>
    {penalty !== undefined && <span className="player-stat"><b>{penalty}</b><span aria-hidden="true">⚑</span></span>}
  </span>;
}
