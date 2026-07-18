import { describe, expect, it } from "vitest";
import { audioCueCategory, audioCueForGameAction, audioSceneForView, normalizeAudioPreferences } from "../src/audio.js";

describe("Audio-System", () => {
  it("normalisiert persistierte Lautstärken sicher auf 0 bis 100", () => {
    expect(normalizeAudioPreferences({ master: 140, music: -5, ui: 44.6, game: Number.NaN, muted: true })).toEqual({ master: 100, music: 0, ui: 45, game: 76, muted: true });
    expect(normalizeAudioPreferences(null)).toEqual({ master: 72, music: 34, ui: 64, game: 76, muted: false });
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
    expect(audioCueCategory("achievement")).toBe("ui");
    expect(audioCueCategory("deal")).toBe("game");
  });
});
