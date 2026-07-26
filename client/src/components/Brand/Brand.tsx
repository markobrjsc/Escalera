// The Escalera wordmark with its flanking card suits. Shared by the access
// screen (full) and the app header (compact). Extracted from the former inline
// markup so the three screens no longer duplicate it (#89).
export function Brand({ variant = "full" }: { variant?: "full" | "compact" }) {
  if (variant === "compact") {
    return <div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><h1 className="brand brand-small">Escalera</h1><span className="brand-suit suit-red">♥</span></div>;
  }
  return <div className="brand-suits" aria-label="Escalera"><span className="brand-suit">♠</span><span className="brand-suit suit-red">♥</span><h1 className="brand">Escalera</h1><span className="brand-suit">♣</span><span className="brand-suit suit-red">♦</span></div>;
}
