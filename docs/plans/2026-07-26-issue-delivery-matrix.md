# Issue-Liefermatrix

| Issue | Ergebnis | Hauptbereiche | Nachweis |
|---|---|---|---|
| #89 | Modulare Komponenten, vollständige Admin-Dev-Galerie | `client/src/components`, `client/src/dev`, Auth | Typecheck, SSR- und Zugriffstests |
| #82 | Sieben Münzen bleiben über das gesamte Spiel erhalten | Game Engine, State, Reconnect | Engine-/State-Tests |
| #81 | Restmünzen kompensieren nach Phase 7 je 30 Strafpunkte | Schlusswertung, Statistik, Achievements | Wertungs-/Statistiktests |
| #83 | Kompakte, absolute Phasenanzeige mit Kartensymbolen | `PhaseHud`, Game-HUD | Präsentations- und Render-Tests |
| #84 | Voice-Status ausschließlich im kompakten Mikrofonbutton | `VoiceStatus`, Game-Shell | Zustands-/Render-Tests |
| #85 | Menülabel ungefähr doppelt so groß | `GameMenu` | CSS-Vertrag/Viewport-QA |
| #86 | Menü maximal 30 vw und volle Höhe | `GameMenu`, Responsive Styles | Viewport-QA |
| #87 | Kompakter Kaufen-Button im Kartenformat | `BuyButton`, Positionierung | Render-/Interaktionstest |
| #88 | Dünnere Rahmen, größere Statusinhalte | Spieler-HUD, Statlabels | Render-/Viewport-QA |
| #75 | Geführtes Tutorial plus vollständiges Nachschlagewerk | Tutorial, Profilfortschritt | Inhalts-, Persistenz-, A11y-Tests |
| #93 | Durchgängiges 3D-Designsystem und echtes Three.js | alle Screens/Komponenten | WebGL-/Fallback-/Motion-/Build-QA |

## Commit-Regel

Jedes Issue erhält genau einen Commit im Format `<bereich>: <Kurzbeschreibung> (#<Nummer>)`. Gemeinsam genutzte Dateien werden je Ticket nur mit dessen fachlich notwendigen Änderungen gestaged.

## Fachentscheidungen

- #81: Kompensation reduziert die Strafsumme, mindestens bis 0; sie erzeugt keine Bonus-Negativstrafe.
- #89: TSX ist die komponenteneigene HTML-/Markup-Datei; jede Komponente erhält zusätzlich eine eigene CSS-Datei.
- #93: Three.js ist progressive Enhancement. Ohne WebGL bleibt die vollständige Anwendung nutzbar.
- `main` bleibt Produktionsbranch und wird in diesem Paket nicht verändert.
