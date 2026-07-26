import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { dataSaverActive, ThreeExperience } from "./ThreeExperience.js";

describe("ThreeExperience", () => {
  it("bleibt rein dekorativ und aus der Bedienoberfläche ausgeschlossen", () => {
    const markup = renderToStaticMarkup(<ThreeExperience scene="game" reducedMotion />);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('data-motion="reduced"');
    expect(markup).toContain('data-scene="game"');
    expect(markup).toContain('tabindex="-1"');
    expect(markup).not.toContain("role=");
  });

  it("lässt sich ohne Browser-Globals serverseitig rendern", () => {
    expect(() => renderToStaticMarkup(<ThreeExperience scene="access" />)).not.toThrow();
  });

  it("erkennt den Datensparmodus vor dem Renderer-Import", () => {
    expect(dataSaverActive({
      connection: { saveData: true }
    } as Navigator & { connection: { saveData: boolean } })).toBe(true);
    expect(dataSaverActive(undefined)).toBe(false);
  });
});
