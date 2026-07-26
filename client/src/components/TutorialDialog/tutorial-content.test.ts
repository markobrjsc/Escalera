import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ALL_TUTORIAL_CHAPTERS_MASK,
  TUTORIAL_CHAPTERS,
  TUTORIAL_CHAPTER_COUNT,
  chapterBit,
  clampTutorialStep,
  filterTutorialChapters,
  isChapterRead,
  readChapterCount
} from "./tutorial-content.js";

describe("vollständige Tutorial-Inhalte", () => {
  it("deckt mit mindestens 14 substanziellen Kapiteln alle App-Wege und Kernregeln ab", () => {
    expect(TUTORIAL_CHAPTER_COUNT).toBeGreaterThanOrEqual(14);
    expect(new Set(TUTORIAL_CHAPTERS.map((chapter) => chapter.id)).size).toBe(TUTORIAL_CHAPTER_COUNT);
    for (const chapter of TUTORIAL_CHAPTERS) {
      expect(chapter.summary.length).toBeGreaterThan(30);
      expect(chapter.details.length).toBeGreaterThanOrEqual(3);
      expect(chapter.keywords.length).toBeGreaterThanOrEqual(4);
    }

    const corpus = JSON.stringify(TUTORIAL_CHAPTERS).toLocaleLowerCase("de");
    for (const topic of [
      "anmeldung", "lobby", "gastgeber", "profilbild", "achievements", "voice-chat",
      "ziehen", "abwerfen", "kaufen", "münze", "gruppe", "straße", "joker",
      "zugzeit", "reconnect", "strafpunkte", "spielende"
    ]) expect(corpus).toContain(topic);
  });

  it("führt alle sieben Phasen mit den vollständigen Anforderungen auf", () => {
    const phases = TUTORIAL_CHAPTERS.find((chapter) => chapter.id === "phasen")?.phases;
    expect(phases).toHaveLength(7);
    expect(phases?.map((phase) => phase.phase)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(phases?.at(-1)?.requirement).toContain("7er-Straße");
  });

  it("sucht akzentunabhängig in Text, Stichworten und Phasen", () => {
    expect(filterTutorialChapters("munzen").some(({ chapter }) => chapter.id === "kaufen")).toBe(true);
    expect(filterTutorialChapters("König").some(({ chapter }) => chapter.id === "strassen-joker")).toBe(true);
    expect(filterTutorialChapters("Phase 7").some(({ chapter }) => chapter.id === "phasen")).toBe(true);
    expect(filterTutorialChapters("nicht-vorhanden")).toEqual([]);
  });

  it("berechnet Fortschritt und Wiederaufnahme deterministisch", () => {
    const mask = chapterBit(0) | chapterBit(4) | chapterBit(15);
    expect(readChapterCount(mask)).toBe(3);
    expect(isChapterRead(mask, 4)).toBe(true);
    expect(isChapterRead(mask, 5)).toBe(false);
    expect(ALL_TUTORIAL_CHAPTERS_MASK).toBe((2 ** TUTORIAL_CHAPTER_COUNT) - 1);
    expect(clampTutorialStep(-1)).toBe(0);
    expect(clampTutorialStep(999)).toBe(TUTORIAL_CHAPTER_COUNT - 1);
  });

  it("verknüpft jedes angekündigte Highlight mit einem echten UI-Element", () => {
    const sources = [
      "../AppHeader/AppHeader.tsx",
      "../LobbyListView/LobbyToolbar/LobbyToolbar.tsx",
      "../LobbyView/LobbyView.tsx",
      "../VoiceStatus/VoiceStatus.tsx",
      "../GameView/GameView.tsx",
      "../GameView/BuyButton/BuyButton.tsx",
      "../GameView/GameBoard/GameBoard.tsx",
      "../GameView/GameBoard/MeldZone/MeldZone.tsx",
      "../GameView/GameHud/PhaseHud/PhaseHud.tsx",
      "../GameView/PlayerHand/PlayerHand.tsx",
      "../GameView/GameMenu/GameMenu.tsx",
      "../results/Scoreboard/Scoreboard.tsx"
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8")).join("\n");

    for (const target of new Set(TUTORIAL_CHAPTERS.flatMap((chapter) => chapter.target ? [chapter.target] : []))) {
      const directTarget = sources.includes(`data-tutorial-target="${target}"`);
      const forwardedTarget = sources.includes(`tutorialTarget="${target}"`);
      expect(directTarget || forwardedTarget, `Highlight-Ziel ${target}`).toBe(true);
    }
  });

  it("verwendet im responsiven Tutorial ausschließlich definierte Design-Tokens", () => {
    const css = readFileSync(new URL("./TutorialDialog.css", import.meta.url), "utf8");
    expect(css).not.toMatch(/--color-(surface|text)\b/);
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("@media (forced-colors: active)");
  });
});
