import { describe, expect, it } from "vitest";
import { audioCueCategory, audioCueForGameAction, audioSceneForView, normalizeAudioPreferences } from "../src/audio.js";

describe("Audio-System", () => {
  it("normalisiert persistierte Lautstärken sicher auf 0 bis 100", () => {
    expect(normalizeAudioPreferences({ music: -5, effects: 144.6, muted: true })).toEqual({ music: 0, effects: 100, muted: true });
    expect(normalizeAudioPreferences(null)).toEqual({ music: 60, effects: 72, muted: false });
  });

  it("führt die bisherigen UI- und Spielpegel in Soundeffekte zusammen", () => {
    expect(normalizeAudioPreferences({ master: 72, music: 34, ui: 64, game: 76, muted: false })).toEqual({ music: 34, effects: 70, muted: false });
  });

  it("ordnet Views ihren musikalischen Szenen zu", () => {
    expect(audioSceneForView("access")).toBe("menu");
    expect(audioSceneForView("list")).toBe("menu");
    expect(audioSceneForView("lobby")).toBe("lobby");
    expect(audioSceneForView("game")).toBe("game");
  });

  it("mappt autoritäre Spielaktionen auf eindeutige SFX", () => {
    expect(audioCueForGameAction("draw")).toBe("draw");
    expect(audioCueForGameAction("meld", false)).toBe("meld");
    expect(audioCueForGameAction("meld", true)).toBe("merge");
    expect(audioCueForGameAction("add-to-meld")).toBe("meldAdd");
    expect(audioCueForGameAction("timeout")).toBe("timeout");
    expect(audioCueForGameAction("unknown")).toBeNull();
    expect(audioCueCategory("achievement")).toBe("effects");
    expect(audioCueCategory("deal")).toBe("effects");
  });
});
