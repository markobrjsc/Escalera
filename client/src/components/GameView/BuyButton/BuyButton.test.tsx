import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BuyButton, fitBuyButtonToDiscard } from "./BuyButton.js";

const noop = () => undefined;

describe("Kaufen-Button", () => {
  it("bleibt in Breite und Höhe innerhalb der Ablagekarte", () => {
    const position = fitBuyButtonToDiscard({ left: 100, top: 180, width: 82, height: 116 }, 390, 48);
    expect(position.width).toBeLessThanOrEqual(82);
    expect(position.height).toBeLessThanOrEqual(116);
  });

  it("zeigt in aktivem und laufendem Zustand ausschließlich Kaufen", () => {
    const position = { left: 20, top: 40, width: 82, height: 48 };
    const active = renderToStaticMarkup(<BuyButton visible position={position} canBuy busy={false} onPointerUp={noop} onClick={noop} />);
    const busy = renderToStaticMarkup(<BuyButton visible position={position} canBuy busy onPointerUp={noop} onClick={noop} />);

    expect(active).toContain(">Kaufen</button>");
    expect(busy).toContain(">Kaufen</button>");
    expect(active).not.toContain("Ablage kaufen ·");
    expect(busy).toContain('aria-busy="true"');
  });
});
