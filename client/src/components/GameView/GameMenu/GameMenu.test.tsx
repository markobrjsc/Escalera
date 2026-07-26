import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GameMenu } from "./GameMenu.js";

const noop = () => undefined;

describe("Spielmenü-Überschrift", () => {
  it("skaliert ausschließlich das Menülabel über eine eigene Klasse", () => {
    const html = renderToStaticMarkup(
      <GameMenu
        sort="rank"
        onSort={noop}
        onScoreboard={noop}
        onProfile={noop}
        onTutorial={noop}
        onLeave={noop}
        onClose={noop}
      />
    );

    expect(html).toContain('<h2 class="game-menu-title">Spielmenü</h2>');
    expect(html).not.toContain('<button class="game-menu-title"');
  });
});
