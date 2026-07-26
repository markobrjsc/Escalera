import { describe, expect, it } from "vitest";
import { tutorialKeyAction } from "./tutorial-keyboard.js";

describe("barrierefreie Tutorial-Tastatursteuerung", () => {
  it("navigiert, öffnet die Suche und pausiert", () => {
    expect(tutorialKeyAction("ArrowLeft", 2, 16, false)).toBe("previous");
    expect(tutorialKeyAction("ArrowRight", 2, 16, false)).toBe("next");
    expect(tutorialKeyAction("/", 2, 16, false)).toBe("search");
    expect(tutorialKeyAction("Escape", 2, 16, true)).toBe("pause");
  });

  it("respektiert Textfelder und Kapitelgrenzen", () => {
    expect(tutorialKeyAction("ArrowLeft", 0, 16, false)).toBeNull();
    expect(tutorialKeyAction("ArrowRight", 15, 16, false)).toBeNull();
    expect(tutorialKeyAction("/", 2, 16, true)).toBeNull();
    expect(tutorialKeyAction("ArrowRight", 2, 16, true)).toBeNull();
  });
});
