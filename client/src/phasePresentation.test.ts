import { describe, expect, it } from "vitest";
import { RANKS, validateGroup, validateStreet, type Card } from "@escalera/game-rules";
import { phasePreview, phaseRequirement } from "./phasePresentation.js";

function ruleCards(cards: ReturnType<typeof phasePreview>["cards"]): Card[] {
  return cards.map((card, index) => ({
    id: `preview-${index}`,
    deck: index < 4 ? 1 : 2,
    kind: "standard",
    ...card
  }));
}

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
    expect(phasePreview(99)).toEqual({ kind: "unknown", groups: 0, size: 0, cards: [] });
  });

  it("zeigt Gruppen als Multiplikator plus exakt eine vollständige Beispielgruppe", () => {
    const requirements = [
      { phase: 1, groups: 1, size: 3 },
      { phase: 2, groups: 2, size: 3 },
      { phase: 3, groups: 1, size: 4 },
      { phase: 4, groups: 2, size: 4 },
      { phase: 5, groups: 1, size: 5 },
      { phase: 6, groups: 2, size: 5 }
    ] as const;

    for (const requirement of requirements) {
      const seenRanks = new Set<string>();
      for (let step = 0; step < RANKS.length; step += 1) {
        const preview = phasePreview(requirement.phase, step);
        expect(preview.kind).toBe("groups");
        expect(preview.groups).toBe(requirement.groups);
        expect(preview.size).toBe(requirement.size);
        expect(preview.cards).toHaveLength(requirement.size);
        expect(new Set(preview.cards.map((card) => card.rank)).size).toBe(1);
        expect(validateGroup(ruleCards(preview.cards), requirement.size).valid).toBe(true);
        seenRanks.add(preview.cards[0].rank);
      }
      expect(seenRanks).toEqual(new Set(RANKS));
    }
  });

  it("iteriert deterministisch durch 52 gültige Siebenerfolgen und Suits", () => {
    const signatures = new Set<string>();
    for (let step = 0; step < RANKS.length * 4; step += 1) {
      const preview = phasePreview(7, step);
      expect(preview.kind).toBe("street");
      expect(preview.cards).toHaveLength(7);
      expect(new Set(preview.cards.map((card) => card.suit)).size).toBe(1);
      expect(validateStreet(ruleCards(preview.cards), { minimumSize: 7, sameSuit: true }).valid).toBe(true);
      signatures.add(preview.cards.map(({ rank, suit }) => `${rank}${suit}`).join("-"));
    }
    expect(signatures.size).toBe(RANKS.length * 4);
    expect(phasePreview(7, RANKS.length * 4)).toEqual(phasePreview(7, 0));
  });
});
