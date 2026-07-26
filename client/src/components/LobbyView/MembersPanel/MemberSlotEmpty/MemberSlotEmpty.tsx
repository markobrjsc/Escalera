// Placeholder seat shown for every open slot left in the lobby.
export function MemberSlotEmpty() {
  return <article className="member-card member-slot-empty" aria-label="Freier Spielerplatz"><span className="empty-seat-icon">+</span><strong>Freier Platz</strong><span>Wartet auf Spieler</span></article>;
}
