// Die Meld-Zone hält immer freie Ablageplätze bereit, damit "neu auslegen" nie
// an fehlendem Platz scheitert und nicht versehentlich als "an bestehenden Meld
// anlegen" gedeutet wird.
//
// Das Raster ist zweispaltig: bei einer ungeraden Anzahl belegter Melds bleibt
// in der letzten Reihe eine Lücke. Diese Lücke wird mitgefüllt (5 Platzhalter),
// bei gerader Anzahl genügen 4. Dadurch endet das Raster immer mit einer
// vollständigen Reihe und es stehen stets mindestens zwei volle Reihen frei.
export const EMPTY_MELD_SLOTS_EVEN = 4;
export const EMPTY_MELD_SLOTS_ODD = 5;

export function emptyMeldSlotCount(occupiedMelds: number) {
  const occupied = Number.isFinite(occupiedMelds) ? Math.max(0, Math.trunc(occupiedMelds)) : 0;
  return occupied % 2 === 1 ? EMPTY_MELD_SLOTS_ODD : EMPTY_MELD_SLOTS_EVEN;
}
