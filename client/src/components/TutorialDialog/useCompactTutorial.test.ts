import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { COMPACT_TUTORIAL_QUERY, matchesCompactTutorial } from "./useCompactTutorial.js";

const original = globalThis.window;

afterEach(() => {
  if (original === undefined) Reflect.deleteProperty(globalThis, "window");
  else Object.defineProperty(globalThis, "window", { value: original, configurable: true, writable: true });
});

function stubWindow(value: unknown) {
  Object.defineProperty(globalThis, "window", { value, configurable: true, writable: true });
}

describe("Kompaktmodus der Kurzanleitung", () => {
  it("schaltet unterhalb der Breitengrenze auf den Feed", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    stubWindow({ matchMedia });
    expect(matchesCompactTutorial()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith(COMPACT_TUTORIAL_QUERY);
  });

  it("bleibt oberhalb der Grenze beim geblätterten Layout", () => {
    stubWindow({ matchMedia: () => ({ matches: false }) });
    expect(matchesCompactTutorial()).toBe(false);
  });

  it("fällt ohne matchMedia auf das geblätterte Layout zurück", () => {
    stubWindow({});
    expect(matchesCompactTutorial()).toBe(false);
  });

  it("nutzt dieselbe Grenze wie das Kompakt-Stylesheet", () => {
    const css = readFileSync(new URL("./TutorialDialog.css", import.meta.url), "utf8");
    const width = COMPACT_TUTORIAL_QUERY.match(/(\d+)px/)![1];
    expect(css).toContain(`@media (max-width: ${width}px)`);
  });
});
