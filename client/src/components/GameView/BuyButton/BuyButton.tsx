export type BuyButtonPosition = { left: number; top: number; width: number; height?: number };

export function fitBuyButtonToDiscard(discard: { left: number; top: number; width: number; height: number }, viewportWidth: number, hudBottom: number): BuyButtonPosition {
  const width = Math.max(1, Math.min(discard.width, viewportWidth - 16));
  const height = Math.max(1, Math.min(discard.height, Math.max(44, discard.height * .38)));
  const gap = Math.max(8, discard.height * .05);
  const left = Math.min(Math.max(discard.left + discard.width / 2 - width / 2, 8), viewportWidth - width - 8);
  const top = Math.max(hudBottom + gap, discard.top - gap - height);
  return { left, top, width, height };
}

// The floating "buy the discard" button, positioned above the discard pile.
export function BuyButton({ visible, position, canBuy, busy, onPointerUp, onClick }: { visible: boolean; position: BuyButtonPosition | null; canBuy: boolean; busy: boolean; onPointerUp: (event: React.PointerEvent<HTMLButtonElement>) => void; onClick: (event: React.MouseEvent<HTMLButtonElement>) => void }) {
  if (!visible || !position) return null;
  return <button type="button" className="buy-button is-available" data-tutorial-target="buy-discard" style={{ left: position.left, top: position.top, width: position.width, height: position.height }} disabled={!canBuy || busy} aria-busy={busy} aria-label={busy ? "Kauf läuft" : "Ablage kaufen, kostet eine Münze"} onPointerUp={onPointerUp} onClick={onClick}>Kaufen</button>;
}
