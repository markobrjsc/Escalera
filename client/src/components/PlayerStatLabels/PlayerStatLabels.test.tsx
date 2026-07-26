import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlayerStatLabels } from "./PlayerStatLabels.js";

describe("Spielerstatuslabels", () => {
  it("trennt vergrößerbare Werte und Icons semantisch", () => {
    const html = renderToStaticMarkup(<PlayerStatLabels coins={5} cards={11} penalty={30} />);

    expect(html).toContain('aria-label="5 Münzen, 11 Karten, 30 Strafpunkte"');
    expect(html.match(/player-stat-value/g)).toHaveLength(3);
    expect(html.match(/player-stat-icon/g)).toHaveLength(3);
  });
});
