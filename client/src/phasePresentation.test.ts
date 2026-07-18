import { describe, expect, it } from "vitest";
import { phaseRequirement } from "./phasePresentation.js";

describe("Phasenanzeige", () => {
  it("nennt für jede Spielphase die erforderliche Auslage", () => {
    expect(Array.from({ length: 7 }, (_, index) => phaseRequirement(index + 1))).toEqual([
      "3 gleiche Werte",
      "2 × 3 gleiche Werte",
      "4 gleiche Werte",
      "2 × 4 gleiche Werte",
      "5 gleiche Werte",
      "2 × 5 gleiche Werte",
      "7er-Straße · gleiches Zeichen"
    ]);
  });

  it("liefert für unbekannte Phasen einen verständlichen Fallback", () => {
    expect(phaseRequirement(99)).toBe("Phasenziel ansehen");
  });
});
