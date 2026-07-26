# Escalera UI- und 3D-Masterplan

Stand: 2026-07-26  
Leitticket: #93  
Mitbearbeitete Tickets: #75, #81–#89  
Ausgenommen: #67

## Zielbild

Escalera behält seine dunkle, warme Kartenraum-Ästhetik und erhält ein konsistentes räumliches System:

- echtes Three.js für Tisch, Licht, Atmosphäre und dekorative Kartengeometrie
- CSS-3D für bedienbare Cards, Dialoge, HUDs und Navigation
- taktile Motion für Hover, Fokus, Drag, Kaufen, Auslegen und Screenwechsel
- vollständig bedienbarer DOM-Fallback ohne WebGL
- reduzierte Bewegung für `prefers-reduced-motion`

## Lieferreihenfolge

1. #89 Komponentenstruktur und Admin-Dev-Galerie stabilisieren.
2. #82 Münzen als spielweites Budget erhalten.
3. #81 Restmünzen in der Schlusswertung strafmindernd verrechnen.
4. #83–#88 Gamefield-Details und Controls korrigieren.
5. #75 Tutorial und vollständiges Regelwerk auf den finalen Controls aufbauen.
6. #93 räumliches Designsystem auf alle Screens und Komponenten anwenden.
7. Gesamte Typprüfung, Tests, Build, Viewport-, Motion-, WebGL- und Fallback-QA ausführen.

## Screen-Plan

### Access

- atmosphärischer Kartentisch mit ruhiger Kameratiefe
- schwebende Login-Card mit Lichtkante und kontrolliertem Pointer-Tilt
- klare Fokusführung und unveränderte Formularsemantik

### Lobby-Liste

- Lobby-Cards als gestaffelte, räumliche Einladungen
- Suchleiste und Header auf einer gemeinsamen Materialebene
- Lade- und Leerzustände ohne Layoutsprung

### Lobby

- Spielerplätze als räumliche Seats
- Ready-, Host- und Voice-Zustände über Licht, Tiefe und Material statt Dauerbewegung
- kompakte Einstellungsbadges mit lesbarer Hierarchie

### Game

- Three.js-Tischunterbau hinter dem bestehenden Game-DOM
- synchronisierte Perspektive für Board, Karten, Stapel und Fluganimationen
- klarere Zonenhierarchie für Ziehen, Ablage, Melds und Hand
- räumliche HUDs, Spielerrahmen, Menü und Kaufen-Control

### Profil, Tutorial, Achievements und Resultate

- Dialoge werden sichtbar aus der Oberfläche angehoben
- Backdrop mit Tiefenstaffelung statt starker Unschärfe
- Achievement-Knoten und Scoreboards mit klarer Ebenenlogik
- Resultate mit fokussiertem Licht und ruhiger Abschlussmotion

## Technische Leitplanken

- genau ein Three.js-Renderer
- Canvas ist dekorativ und erhält `aria-hidden="true"`
- keine Canvas-only-Buttons, Texte oder Drop-Zonen
- Canvas wird lazy geladen und bei unsichtbarem Dokument pausiert
- WebGL-Fehler aktivieren automatisch den CSS-Fallback
- Pointer-Tilt verändert CSS-Variablen direkt und löst keinen React-Render pro Frame aus
- Touch, Tastatur und Screenreader bleiben gleichwertige Eingabepfade

## Fertig

- [ ] Alle Tickets besitzen getrennte, nachvollziehbare Commits.
- [x] Alle Akzeptanzkriterien sind automatisiert oder in der QA-Matrix geprüft.
- [ ] `npm run typecheck`, `npm test` und `npm run build` sind grün.
- [x] Keine Regression bei Anmeldung, Lobby, Spielzug, Voice, Profil oder Tutorial.
- [x] Kein Push oder Merge nach `main`.
