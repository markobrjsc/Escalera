import { describe, expect, it } from "vitest";
import { normalizeVisualScene, VISUAL_SCENE_THEMES } from "./themes.js";

describe("3D-Szenen", () => {
  it("stellt für jeden App-Screen eine eigene Stimmung bereit", () => {
    expect(Object.keys(VISUAL_SCENE_THEMES)).toEqual(["access", "list", "lobby", "game"]);
    expect(VISUAL_SCENE_THEMES.game.energy).toBeGreaterThan(VISUAL_SCENE_THEMES.access.energy);
  });

  it("fällt für unbekannte Screens auf die Zugangsszene zurück", () => {
    expect(normalizeVisualScene("unbekannt")).toBe("access");
  });
});
