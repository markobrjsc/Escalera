import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { makeUser } from "../../dev/fixtures.js";

vi.mock("../../audio.js", () => ({
  useAudio: () => ({ play: vi.fn() })
}));

import { TutorialDialog } from "./TutorialDialog.js";

const noop = () => undefined;

describe("TutorialDialog", () => {
  it("rendert für neue Spieler den geführten, pausierbaren und barrierefreien Ablauf", () => {
    const html = renderToStaticMarkup(
      <TutorialDialog
        user={makeUser({ tutorialCompleted: false, tutorialStep: 3, tutorialReadMask: 7 })}
        onUser={noop}
        onClose={noop}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-pressed="true">Geführt');
    expect(html).toContain("Pausieren");
    expect(html).toContain("Kapitel 4 von 16");
    expect(html).toContain('role="progressbar"');
  });

  it("rendert für abgeschlossene Spieler die durchsuchbare Regelreferenz", () => {
    const html = renderToStaticMarkup(
      <TutorialDialog user={makeUser({ tutorialStep: 11 })} onUser={noop} onClose={noop} />
    );

    expect(html).toContain('aria-pressed="true">Referenz');
    expect(html).toContain('type="search"');
    expect(html).toContain("Regeln durchsuchen");
    expect(html).toContain("Kapitelreferenz");
    expect(html).toContain("Anforderungen aller sieben Phasen");
    expect(html).toContain("Fortschritt zurücksetzen");
  });
});
