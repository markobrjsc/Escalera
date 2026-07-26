# UI-, UX- und 3D-QA-Matrix

## Viewports

- 350 × 550 Portrait
- 390 × 844 Portrait
- 550 × 350 Landscape
- 844 × 390 Landscape
- 1280 × 720 Desktop
- 1440 × 900 Desktop

## Zustände pro Screen

- Access: Login, Registrierung, Fehler, Tastaturfokus
- Lobby-Liste: Laden, leer, gefüllt, Suche, Dialog
- Lobby: Host, Gast, Ready, Voice online/offline, volle Lobby
- Game: Ziehen, Kaufen, Auslegen, Abwerfen, Menü, Timeout, Reconnect
- Profil: eigenes/fremdes Profil, Avatar, Audio, Achievements
- Tutorial: Erststart, Pause, Fortsetzen, Kapitelwahl, Reset
- Resultate: Runde, Scoreboard, Finale

## Prüfkriterien

- [x] Keine Überlappung, abgeschnittenen Inhalte oder unbeabsichtigten Scrollbars.
- [x] Fokusreihenfolge und sichtbarer Fokus sind vollständig.
- [x] Alle Aktionen besitzen gleichwertige Maus-, Touch- und Tastaturpfade.
- [x] Screenreader-relevante Texte bleiben DOM-basiert.
- [x] `prefers-reduced-motion` entfernt nicht notwendige Bewegung; `?motion=full` bleibt eine bewusste Ausnahme.
- [x] WebGL deaktiviert oder Datensparmodus aktiv: identischer Funktionsumfang mit CSS-Fallback.
- [x] WebGL Context Loss: automatischer Restore oder stabiler CSS-Fallback.
- [x] Hintergrundtab: Renderer und Daueranimationen pausieren.
- [x] Karten-Drag, Drop-Zonen und Fluganimationen behalten ihre bestehende gemeinsame Perspektive.
- [x] Phasen-, Voice-, Menü-, Kaufen- und Spielerstatus erfüllen #83–#88.
- [x] Tutorial deckt alle in #75 genannten Wege und Regeln ab.

## Automatisierte Gates

1. Typprüfung aller Workspaces
2. Unit- und Render-Tests aller Workspaces
3. Produktionsbuild
4. zentrale CSS-/Markup-Vertragstests
5. Browser-Smoke-Test der Hauptscreens
6. Console- und Netzwerkfehlerprüfung

## Abschlussprotokoll

- Browser-Smoke: Access, Registrierung, Tutorial, Lobbyliste, Lobby, Profil, Erfolgsbaum, Admin-Galerie, Drehhinweis und echte Zwei-Spieler-Partie.
- Viewports: 350 × 550, 390 × 844, 550 × 350, 844 × 390, 1280 × 720 und großer Desktop.
- WebGL2: ein persistenter Canvas-Kontext, adaptive DPR-/FPS-/Geometrie-Budgets, statische Nicht-Game-Szenen und kontinuierliches Rendering nur im Game.
- Fallbacks: WebGL1/Blockade, Datensparmodus, fehlgeschlagene Initialisierung oder Restore behalten das vollständige CSS-3D-Interface.
- Automatisiert: 33 fokussierte 3D-/Lifecycle-Testfälle, kompletter Typecheck, PostCSS-Parse und Komponenten-/Ticket-Vertragstests.
