import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
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

  it("begrenzt das Panel in Basis- und Landscape-Regeln auf 30 vw bei voller Höhe", () => {
    const panel = readFileSync(new URL("./GameMenu.panel.css", import.meta.url), "utf8");
    const responsive = readFileSync(new URL("../../../styles/views-responsive.trailing.css", import.meta.url), "utf8");

    expect(panel).toMatch(/width:\s*min\(30vw,/);
    expect(panel).toContain("height: 100dvh");
    expect(responsive).toMatch(/width:\s*min\(30vw,/);
    expect(responsive).not.toContain("70vw");
  });
});
