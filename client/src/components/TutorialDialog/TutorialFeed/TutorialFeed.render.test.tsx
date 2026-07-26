import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TutorialFeed } from "./TutorialFeed.js";
import { TUTORIAL_CHAPTERS } from "../tutorial-content.js";

const noop = () => undefined;
// renderToStaticMarkup escapes text, so fixture strings have to be compared in
// their escaped form.
const escape = (value: string) => value.replace(/&/g, "&amp;");

describe("TutorialFeed", () => {
  const html = renderToStaticMarkup(<TutorialFeed readMask={0} onReach={noop} />);

  it("zeigt alle Kapitel in einem einzigen Lesefluss", () => {
    expect(html.match(/class="tutorial-feed-chapter"/g)).toHaveLength(TUTORIAL_CHAPTERS.length);
    for (const chapter of TUTORIAL_CHAPTERS) expect(html).toContain(escape(chapter.summary));
  });

  it("gibt jedem Kapitel eine eigene Überschrift", () => {
    expect(html.match(/class="tutorial-chapter-heading"/g)).toHaveLength(TUTORIAL_CHAPTERS.length);
    expect(html).toContain(escape(TUTORIAL_CHAPTERS[0].title));
  });

  it("enthält keine Blätter- oder Moduselemente", () => {
    expect(html).not.toContain("Weiter");
    expect(html).not.toContain("Zurück");
    expect(html).not.toContain("Pausieren");
    expect(html).not.toContain("Fortschritt zurücksetzen");
    expect(html).not.toContain("tutorial-index");
    expect(html).not.toContain("tutorial-mode-switch");
  });

  it("markiert bereits gelesene Kapitel", () => {
    const withRead = renderToStaticMarkup(<TutorialFeed readMask={1} onReach={noop} />);
    expect(withRead).toContain("✓ Gelesen");
  });
});
