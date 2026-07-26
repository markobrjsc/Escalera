// Freier Ablageplatz in der Meld-Zone. Rein visuelle Zielfläche: Klick und Drop
// laufen über die umschließende Meld-Zone weiter, damit "neu auslegen" auch bei
// vollem Raster eine eindeutige Fläche behält.
export function MeldSlotEmpty() {
  return <article className="meld-card meld-slot-empty" aria-hidden="true"><span className="meld-slot-icon">+</span><span className="meld-slot-label">Neue Kombination</span></article>;
}
