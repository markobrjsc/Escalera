// The transient game event log ("X zieht eine Karte", …).
export function GameEvents({ events }: { events: Array<{ key: string; text: string }> }) {
  return <div className="game-events" aria-live="polite">{events.map((event) => <span className="game-event" key={event.key}>{event.text}</span>)}</div>;
}
