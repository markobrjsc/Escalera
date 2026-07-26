import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { makeLobby } from "../../../dev/fixtures.js";
import { FinalResultOverlay } from "./FinalResultOverlay.js";

describe("FinalResultOverlay", () => {
  it("zeigt kompensierte Strafpunkte positiv im Endergebnis", () => {
    const html = renderToStaticMarkup(<FinalResultOverlay
      placements={[{ userId: "u-host", rank: 1, totalPenalty: 20, compensatedPenalty: 90 }]}
      lobby={makeLobby()}
      onLeave={async () => true}
    />);
    expect(html).toContain("90 kompensierte Strafpunkte");
    expect(html).toContain("20 Punkte");
  });
});
