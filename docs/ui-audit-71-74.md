# UI-Audit für #71 und #74

## Visuelle Leitidee: Escalera, nur präziser

Der bestehende minimalistische Schwarz-Grün-Charakter bleibt die Grundlage. Die Überarbeitung arbeitet bewusst mit kleinen Eingriffen: leicht ruhigere Radien, dezente Tiefenstaffelung, konsistentere Zustände, bessere Abstände und klarere Informationsgruppen. Es gibt keine neue Farbwelt und keine dekorativen Großflächen.

Die gemeinsamen Tokens und Interaktionszustände liegen in `client/src/styles/design-system.css`. Hover, Fokus, Flächen und Dialoge folgen damit weiterhin dem vorhandenen System, wirken aber etwas klarer.

## Screen-Audit und umgesetzte Verbesserungen

### Login und Registrierung

- Die bekannte, reduzierte Anordnung bleibt erhalten.
- Die Karte darf auf kleinen Displays mehr Höhe nutzen und besitzt eine dezentere Tiefenstaffelung.
- Fokus und Tastaturbedienung sind klarer sichtbar.

### Lobbyliste

- Suche, Erstellen und Beitreten bleiben an ihren bekannten Positionen.
- Lobbykarten trennen sich durch eine sehr leichte Grünabstufung besser vom Hintergrund.
- Leere Zustände und Listenflächen sind eindeutiger abgegrenzt.

### Lobby erstellen und Einstellungen

- Die bekannten Felder bleiben unverändert.
- Auf ausreichend breiten Ansichten stehen zusammengehörige Werte kompakt in zwei Spalten; auf Mobile bleibt die einspaltige Form erhalten.

### Lobby

- Spielerzustände sind als kleine Statuslabels besser scanbar.
- Regelzeile, Mitgliederfläche und Karten erhalten konsistentere Abstände und Konturen.

### Game-Screen und Menü

- Unverändert: Tilt, Handposition, Ablage, Nachziehstapel, Meld-Zone und alle grundlegenden Spielfeldpositionen.
- Münzen, Karten und Strafpunkte erscheinen als kompakte Zahl-plus-Icon-Labels.
- Die Phasenbox nennt jederzeit die konkret erforderliche Auslage.
- Das Menü verwendet auf niedrigen Landscape-Displays ein kompakteres Raster.

### Eigenes und fremdes Profil

- Die bekannte Struktur bleibt erhalten.
- Statistik-, Audio- und Voice-Flächen verwenden dieselben dezenten Grünabstufungen und Konturen.
- Die Steuerung fremder Spieler bleibt funktional getrennt, wirkt aber wie ein Teil desselben Profilsystems.

### Achievements

- Die Pfade wachsen radial in mehrere Richtungen statt ausschließlich nach rechts.
- Pan, Zoom, Touch, Maus, Fokus, Tooltips und Gesamtübersicht bleiben erhalten.

## Responsive- und Accessibility-Regeln

- Temporäre Layoutverdichtung betrifft nur das Menü, nicht das Gamefield.
- Fokus ist zusätzlich zur Farbe durch eine sichtbare Kontur gekennzeichnet.
- Icon-Statistiken besitzen eine vollständige zugängliche Textbeschreibung.
- Formulare wechseln nur dann in zwei Spalten, wenn genug Breite vorhanden ist.
