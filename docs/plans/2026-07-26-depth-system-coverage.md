# Issue #93 – DOM-3D-/Motion-Abdeckung

## Integrationsvertrag

- `client/src/styles/depth-system.css` wird nach den bestehenden Komponenten- und Animations-Styles geladen.
- `useSurfaceTilt()` wird einmal am App-Root aktiviert. Das Event-Delegation-Modul schreibt ausschließlich CSS-Variablen und die Klasse `is-depth-active`.
- DOM, Fokusreihenfolge, ARIA, Klickflächen und bestehende Komponentenlogik bleiben unverändert.
- Das Three.js-Canvas bleibt Dekoration. Die opake Gamefield-Fläche wird durch eine kontrastreiche Ebene mit kontrollierter Transparenz ersetzt.

## Abdeckung

| Bereich | Auditierte Klassen / Elemente | 3D-Behandlung |
|---|---|---|
| Screen-Grundlagen | `#root`, `.view-slide`, `.portrait-view`, `.landscape-view`, `.login-view`, `.lobby-view`, `.game-view`, `.orientation-notice`, `.tree-overlay`, `.game-result-overlay` | Root-Perspektivraum ohne lokale Fixed-Containing-Blocks, dunkle Materialebenen, räumliche Umgebungsbeleuchtung |
| App-Chrome | `.app-header`, `.game-menu`, `.game-nav-button`, `.game-status-bar`, `.dialog-title`, `.tree-overlay-bar` | Glas-/Metallkante, Tiefenschatten, Inset-Licht, Blur |
| Hauptflächen | `.surface`, `.login-card`, `.lobby-browser`, `.members-panel`, `.dialog`, `.profile-dialog`, `.tutorial-dialog`, `.confirmation-dialog`, `.player-interaction-card`, `.result-panel`, `.pile-design-panel` | Materialgradient, Kante, mehrstufige Schatten, additive Pointer-Neigung |
| Lobby-Karten | `.lobby-card`, `.member-card`, `.member-slot-empty`, `.empty-state`, `.setting-badges`, `.badge`, `.lobby-pill`, `.member-state` | Kartenstärke, Statusglühen, Hover-/Fokus-Elevation |
| Game-HUD | `.active-player-hud`, `.turn-order-player`, `.phase-hud`, `.turn-countdown`, `.game-event`, `.voice-status`, `.player-stat` | schwebende Glasflächen, Statuslicht, lesbare Tiefenkanten |
| Spieltisch | `.game-board`, `.pile-slot`, `.pile-stack`, `.game-pile`, `.meld-card`, `.meld-cards`, `.playing-card`, `.card-3d`, `.card-face` | vorhandene Board-Perspektive bewahrt, Tischvolumen, Stapeltiefe, Karten-Glanz und -Elevation |
| Resultate | `.result-panel`, `.result-row`, `.placement-1`, `.score-history-scroll`, Score-Tabelle | gestaffelte Zeilen, Siegerlicht, vertiefte Tabelle |
| Profil / Audio | `.profile-icon`, `.profile-summary`, `.stat-grid span`, `.profile-audio`, `.audio-level`, `.player-voice-controls`, `.audio-mute` | Avatar-Medaillon, vertiefte Regler, modulare Karten |
| Erfolge | `.tree-tile`, `.tree-tooltip`, `.achievement-toast`, `.panzoom`, `.tree-overlay-bar` | Kachelvolumen, freigeschaltetes Glühen, schwebende Tooltips |
| Formulare | Text-/Passwortfelder, `select`, `textarea`, `.toggle`, Checkbox, Range | vertiefte Eingaben, klare Fokusbeleuchtung, native Semantik |
| Aktionen | `button`, `.button`, `.button-primary`, `.button-danger`, `.button-icon`, Avatar-/Profil-/Navigationstasten | Kantenstärke, Presszustand, Hover-Hub, sichtbarer Fokus |
| Choreografie | `.match-intro-fan`, `.deal-stage`, `.fx-layer`, `.fx-face`, `.drag-ghost` | vorhandene Abläufe bleiben Eigentümer ihrer Transforms; zusätzliche Licht-/Schattentiefe |
| Komponenten-Galerie | `.dev-shell`, `.dev-canvas`, `.dev-tile` | identische Material- und Tilt-Prüfflächen für visuelle QA |

## Konflikt- und Performance-Regeln

- `view-slide`, `.dialog`, `.playing-card`, `.game-board`, Stapelschichten und Flight-Layer behalten ihre bestehenden `transform`-Keyframes.
- Pointer-Neigung nutzt die additiven CSS-Properties `translate` und `rotate`; sie überschreibt kein bestehendes `transform`.
- Ein einziger passiver `pointermove`-Listener bedient alle Oberflächen per Event Delegation.
- Pro Frame erfolgen höchstens ein `getBoundingClientRect()` und ein Style-Write; React rendert dabei nicht neu.
- Touch-Pointer werden ignoriert. Maus und Stift sind vektoriell auf maximal 2,5° begrenzt.
- `prefers-reduced-motion` und `.motion-reduced` deaktivieren Neigung und Bewegung, behalten aber Material, Kanten, Fokus und Statusfarbe.
- Three.js wird erst nach erfolgreicher WebGL2-Akquisition am echten Canvas geladen; Renderer und Prüfung teilen exakt diesen einen Kontext. WebGL1-only, blockierte oder verlorene Kontexte behalten den vollständigen CSS-Hintergrund.
- Kontextverlust stoppt Render- und Resize-Loops. Nach erfolgreicher Wiederherstellung wird die Szene neu vermessen; ein fehlgeschlagener Restore bleibt im Fallback.
- Unmount und fehlgeschlagene Initialisierung entfernen Listener, Frames, Geometrien, Materialien, Renderer und Kontext.
- Responsive Ansichten reduzieren Winkel, Z-Hub, Geometrie, DPR, Partikel, Schattenreichweite und Backdrop-Blur. Antialiasing und Power-Preference werden einmal bei der Kontextakquisition gewählt; alle dynamisch sicheren Budgets reagieren auf Viewportwechsel.

## QA

- [x] Alle produktiven Screenfamilien und die Komponenten-Galerie klassenseitig auditiert.
- [x] Pure Tilt-Geometrie testet Mittelpunkt, Rand, Clamping und degenerierte Flächen.
- [x] Isolierter strikter TypeScript-Check für `useSurfaceTilt.ts`.
- [x] CSS durch PostCSS parsen.
- [x] WebGL2-Erkennung, SSR-Markup, Quality-Tiers und Fallback-Helfer isoliert testen.
- [x] Nach Root-Integration den vollständigen Typecheck ausführen.
- [ ] Alle Client-Tests und den Produktionsbuild im PR-CI-Gate bestätigen.
- [x] Login, Lobbyliste, Lobby, echtes Gamefield, Profil, Tutorial, Erfolge und Resultate visuell in Desktop und Mobile prüfen.
- [x] Reduced Motion, Tastaturfokus und Touch-Verträge im Browser sowie WebGL-Fallback und Context Loss automatisiert prüfen.
