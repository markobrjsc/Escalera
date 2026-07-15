# Frontend-Designsystem

## Gestaltungsprinzip

Das Design ist dunkel, minimalistisch, kräftig und überwiegend viereckig. Flächen werden vor allem durch klare Rahmen statt durch Schatten oder viele Hintergrundfarben getrennt. Alle Views verwenden dieselben Tokens und Basiskomponenten.

## Farbpalette

| Token | Farbe | Hex | Verwendung |
|---|---|---:|---|
| White | Weiß | `#FFFFFF` | Text, Rahmen, aktive Flächen |
| Deep Teal | Tiefes Teal | `#52796F` | Akzent, Fokus, Auswahl |
| Jet Black | Dunkelgrün-Schwarz | `#20312D` | sekundäre Flächen und abgestufte Cards |
| Onyx | Schwarz | `#0D0D0D` | Hintergrund aller Views und Cards |

Status- und Kartenfarben dürfen die Palette gezielt erweitern. Ein Zustand darf nie nur über Farbe vermittelt werden, sondern zusätzlich über Text, Symbol, Rahmenmuster oder Form.

## Typografie

- Gewünschte Display-Schrift für große Titel: [Dragon Hunter](https://www.fontspace.com/dragon-hunter-font-f92096)
- Die kostenlose Version ist nur für persönliche, nicht-kommerzielle Nutzung freigegeben.
- Die Font-Datei darf erst in das Projekt aufgenommen werden, wenn eine passende Lizenz dokumentiert ist.
- Bis dahin wird eine kräftige, frei nutzbare Fallback-Display-Schrift verwendet.
- Eingaben, Fließtext, Zahlen und kleine Statuswerte verwenden eine gut lesbare Sans-Serif-Systemschrift.
- Überschriften sind groß, fett und kompakt; die responsive Typografie-Skala wird zentral definiert.

## Buttons

- mindestens 44 Pixel hoch und breit
- 2 Pixel klarer Rahmen
- kleiner, beinahe eckiger Radius
- Onyx oder transparenter Hintergrund
- kräftige Schrift und kompakter Text
- eindeutige Zustände für Fokus, Hover, Aktiv, Deaktiviert und Laden
- Primäraktionen nutzen White oder Deep Teal, ohne den Border-Stil zu verlassen

## Textfelder

- gleiche Höhe, Rahmenstärke und Radiuslogik wie Buttons
- Label immer sichtbar; Placeholder ersetzt kein Label
- Onyx-Hintergrund, weißer Text und klarer Fokusrahmen in Deep Teal
- Fehlertext und Fehlerindikator zusätzlich zur Farbe

## Cards, Dialoge und Header

- Hintergrund Onyx, optional Jet Black für eine zweite Ebene
- 1 bis 3 Pixel Rahmen, standardmäßig 2 Pixel
- kleiner Radius; keine stark runden Pillen außer kompakten Status-Badges
- Dialoge erscheinen als fokussierte Border-Card über einer abgedunkelten Onyx-Fläche
- Header verwenden dieselbe Höhen-, Rahmen- und Typografieskala

## Basiskomponenten

Vor dem Ausbau einzelner Views werden wiederverwendbare Varianten festgelegt für:

- Button und Icon-Button
- Textfeld und Passwortfeld
- Card und Dialog
- Header und Navigation
- Badge und Statusanzeige
- Profilbild
- Spielkarte und Spielerstapel
- Lade-, Leer- und Fehlerzustand

