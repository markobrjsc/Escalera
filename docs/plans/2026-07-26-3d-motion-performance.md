# 3D-, Motion- und Performance-Regeln

## Tiefensystem

| Ebene | Verwendung |
|---|---|
| 0 | atmosphärischer Three.js-Hintergrund |
| 1 | Tisch und große Screen-Flächen |
| 2 | Panels, Listen und Boards |
| 3 | Cards, Controls und HUDs |
| 4 | Hover, Fokus, Drag und aktive Ziele |
| 5 | Dialoge, Tutorial und Resultat-Overlays |

Zentrale Tokens definieren Perspektive, Bevel, Schatten, Glanz, Übersetzung und Rotationsgrenzen. Komponenten dürfen keine voneinander abweichenden freien Tiefenwerte einführen.

## Motion-Verträge

- Hover: maximal 220 ms, kleine Z-Anhebung, höchstens 2,5° Neigung.
- Fokus: sofort erkennbare Lichtkante; keine Bewegung erforderlich.
- Press: 160–220 ms, kurze Absenkung statt Skalierungsflackern.
- Screenwechsel: 500–560 ms; die bewusst beibehaltene Choreografie lässt alte und neue Ebene räumlich nachvollziehbar.
- Kartenflug: eine gemeinsame Board-Perspektive und durchgehende Rotation.
- Daueranimationen: nur dekorativ, langsam und pausierbar.
- Reduced Motion: keine Parallax, kein Float, keine Partikelbewegung, keine 3D-Kamerafahrt.

## Renderer-Budget

- ein Canvas und ein WebGL-Kontext
- Desktop-DPR maximal 1,75; Mobil-DPR maximal 1,25
- antialiasing nur oberhalb der Low-Quality-Stufe
- keine dynamischen Echtzeitschatten auf Low/Medium
- statische Geometrie und Materialien wiederverwenden
- Rendern nur bei Änderung; aktives Game darf bei Bedarf kontinuierlich rendern
- bei `document.hidden` sofort pausieren
- nach Context Loss CSS-Fallback aktivieren

## DOM-Surface-Budget

- Pointer-Tilt über `requestAnimationFrame` und CSS-Variablen
- kein React-State pro Pointerbewegung
- räumliche Bewegung nur über `transform`, `translate`, `rotate` und `opacity`; kurze Farb-, Kanten- und Schattentransitionen dürfen Mikrofeedback geben
- `will-change` nur während aktiver Interaktion
- Touch-Geräte ohne Hover erhalten Press- und Fokusfeedback

## Qualitätsstufen

- `static`: Reduced Motion oder kein WebGL
- `economy`: kleine Displays, grober Pointer oder schwache GPU
- `balanced`: Standard für Tablets und normale Desktops
- `high`: leistungsfähiger Desktop

Die visuelle Information bleibt in allen Stufen identisch; nur dekorative Tiefe und Bewegungsdichte ändern sich.
