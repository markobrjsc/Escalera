import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PhaseHud } from "./PhaseHud.js";

function cardCount(html: string) {
  return html.match(/class="phase-preview-card /g)?.length ?? 0;
}

describe("PhaseHud-Rendering", () => {
  it("zeigt nur eine Beispielgruppe mit korrektem Multiplikator und Kartenwert", () => {
    const html = renderToStaticMarkup(<PhaseHud round={6} phase={4} phaseLaid={false} previewStep={2} />);
    expect(html).toContain("Runde 6/7");
    expect(html).toContain(">2×<");
    expect(cardCount(html)).toBe(4);
    expect(html.match(/data-rank="4"/g)).toHaveLength(4);
    expect(html).toContain("4 gleiche Werte");
    expect(html).toContain("Phase offen");
  });

  it("rendert Phase 7 als sieben aufeinanderfolgende Karten desselben Suits", () => {
    const html = renderToStaticMarkup(<PhaseHud round={7} phase={7} phaseLaid previewStep={14} />);
    expect(cardCount(html)).toBe(7);
    expect(html.match(/data-suit="hearts"/g)).toHaveLength(7);
    expect([...html.matchAll(/data-rank="([^"]+)"/g)].map((match) => match[1])).toEqual(["3", "4", "5", "6", "7", "8", "9"]);
    expect(html).toContain("Phase ausgelegt");
  });
});
