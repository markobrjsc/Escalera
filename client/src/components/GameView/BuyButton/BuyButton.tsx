// The floating "buy the discard" button, positioned above the discard pile.
export function BuyButton({ visible, position, canBuy, busy, onPointerUp, onClick }: { visible: boolean; position: { left: number; top: number; width: number } | null; canBuy: boolean; busy: boolean; onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  if (!visible || !position) return null;
  return <button type="button" className="buy-button is-available" style={{ left: position.left, top: position.top, width: position.width }} disabled={!canBuy} aria-busy={busy} onPointerUp={onPointerUp} onClick={onClick}>{busy ? "Karte wird gekauft …" : "Ablage kaufen · 1 Münze"}</button>;
}
