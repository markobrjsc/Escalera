import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MeldZone } from "./MeldZone.js";
import type { GameMeld } from "../../../../lib/types.js";

const noop = () => {};

function meld(id: string): GameMeld {
  return { id, ownerId: "p1", type: "group", sameSuit: false, cards: [{ id: `${id}-a`, rank: "7", suit: "hearts" }, { id: `${id}-b`, rank: "7", suit: "spades" }, { id: `${id}-c`, rank: "7", suit: "clubs" }] } as GameMeld;
}

function render(melds: GameMeld[], zoneClassName = "") {
  return renderToStaticMarkup(<MeldZone melds={melds} openMelds={[]} zoneClassName={zoneClassName} zoneRef={noop} onZoneClick={noop} meldRef={() => noop} onMeldActivate={noop} arrivals={{}} />);
}

function slotCount(html: string) {
  return html.match(/meld-slot-empty/g)?.length ?? 0;
}

describe("MeldZone-Rendering", () => {
  it("zeigt auch ohne ausgelegte Melds vier freie Ablageplätze", () => {
    const html = render([]);
    expect(slotCount(html)).toBe(4);
    expect(html).toContain("Neue Kombination");
  });

  it("füllt bei ungerader Meld-Anzahl die Rasterlücke mit einem fünften Platz", () => {
    expect(slotCount(render([meld("m1")]))).toBe(5);
    expect(slotCount(render([meld("m1"), meld("m2"), meld("m3")]))).toBe(5);
  });

  it("behält bei gerader Meld-Anzahl vier freie Plätze", () => {
    expect(slotCount(render([meld("m1"), meld("m2")]))).toBe(4);
  });

  it("rendert belegte Melds weiterhin und hält die Zone als Drop-Ziel", () => {
    const html = render([meld("m1"), meld("m2")]);
    expect(html.match(/data-zone="meld:m\d"/g)).toHaveLength(2);
    expect(html).toContain('data-zone="meldzone"');
  });

  it("markiert die freien Plätze über den Zonenzustand, nicht über eigene Interaktion", () => {
    const html = render([meld("m1")], "is-target");
    expect(html).toContain("meld-zone is-target");
    expect(html).toContain('aria-hidden="true"');
  });
});
