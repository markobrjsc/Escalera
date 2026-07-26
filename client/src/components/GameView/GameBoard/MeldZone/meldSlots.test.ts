import { describe, expect, it } from "vitest";
import { emptyMeldSlotCount } from "./meldSlots.js";

describe("Freie Meld-Plätze", () => {
  it("hält bei gerader Anzahl belegter Melds vier freie Plätze bereit", () => {
    expect(emptyMeldSlotCount(0)).toBe(4);
    expect(emptyMeldSlotCount(2)).toBe(4);
    expect(emptyMeldSlotCount(8)).toBe(4);
  });

  it("füllt bei ungerader Anzahl zusätzlich die offene Rasterlücke", () => {
    expect(emptyMeldSlotCount(1)).toBe(5);
    expect(emptyMeldSlotCount(3)).toBe(5);
    expect(emptyMeldSlotCount(7)).toBe(5);
  });

  it("ergibt zusammen mit den belegten Melds immer eine gerade Zellenzahl", () => {
    for (let occupied = 0; occupied <= 12; occupied += 1) {
      expect((occupied + emptyMeldSlotCount(occupied)) % 2).toBe(0);
    }
  });

  it("behandelt ungültige Eingaben wie eine leere Zone", () => {
    expect(emptyMeldSlotCount(-3)).toBe(4);
    expect(emptyMeldSlotCount(Number.NaN)).toBe(4);
  });
});
