import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

// #101: Der Service Worker beantwortet jede Navigation aus dem Precache. Steht
// die Aktualisierung nicht auf "autoUpdate", bleibt eine neue Fassung im
// Wartezustand und Besucher sehen dauerhaft die alte Oberfläche — ein Fehler,
// der erst in der Produktion sichtbar wird. Diese Prüfung hält die Konfiguration
// fest, damit sie nicht unbemerkt zurückfällt.
describe("Aktualisierung der installierten Anwendung", () => {
  const config = readFileSync(new URL("../vite.config.ts", import.meta.url), "utf8");

  it("übernimmt neue Fassungen selbsttätig", () => {
    expect(config).toContain('registerType: "autoUpdate"');
    expect(config).not.toContain('registerType: "prompt"');
  });

  it("löst den bereits laufenden Service Worker sofort ab", () => {
    expect(config).toContain("skipWaiting: true");
    expect(config).toContain("clientsClaim: true");
  });

  it("behält die bewusste Ausnahme für den Three.js-Chunk aus #93", () => {
    expect(config).toContain('globIgnores: ["**/createThreeScene-*.js"]');
  });
});
