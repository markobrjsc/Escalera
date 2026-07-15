# Responsive Skalierung und Ausrichtung

## Ziel

Escalera soll auf allen unterstützten Smartphones unabhängig von Displaygröße und Seitenverhältnis möglichst gleich proportioniert wirken. Die visuelle Hierarchie, die relative Größe der Bereiche und die Position der Hauptaktionen bleiben gleich.

Eine einzelne globale `transform: scale(...)`-Lösung wird nicht verwendet. Sie würde Text, Touch-Ziele, Fokusdarstellung, Safe Areas und Scrollbereiche unzuverlässig machen. Stattdessen werden Maße über zentrale responsive Design-Tokens flüssig skaliert und sinnvoll begrenzt.

## Unterstützte Mindestgrößen

- Hochformat-Views: mindestens 350 × 550 CSS-Pixel
- Querformat-Spielansicht: mindestens 550 × 350 CSS-Pixel
- größere Viewports skalieren flüssig nach oben
- Safe Areas von iOS und Android werden immer berücksichtigt

## Ausrichtung

- Login/Register: Hochformat
- Lobbyliste: Hochformat
- Lobbyansicht: Hochformat
- Spielansicht: Querformat

Wird eine View in der falschen Ausrichtung geöffnet, erscheint eine klare Drehaufforderung. Ein Spielzustand oder eine Eingabe darf dabei nicht verloren gehen.

## Skalierungsmodell

- zentrale CSS-Custom-Properties für Schrift, Abstände, Radien, Rahmen, Controls und Kartenmaße
- flüssige Werte mit `clamp()`, `min()`, `max()`, `dvh`, `dvw` und `aspect-ratio`
- Layoutcontainer orientieren sich an einer Designfläche pro Ausrichtung
- Mindestgröße für Touch-Ziele: 44 × 44 CSS-Pixel
- Schrift und Controls erhalten Unter- und Obergrenzen und werden niemals unlesbar verkleinert
- Safe Areas fließen über `env(safe-area-inset-*)` in die Außenabstände ein

## Scrollregeln

- Hochformat-Views scrollen nicht als ganze Seite.
- Die Lobbyliste besitzt einen begrenzten internen Scrollbereich.
- Der Lobby-Screen hält Einstellungen, Spieler und Hauptaktionen gleichzeitig erreichbar.
- Im Spiel dürfen Meld-Zone und Hand bei Bedarf intern scrollen.
- Navbar, Gegner, Stapel und zentrale Aktionen bleiben fest erreichbar.

## Prüfmatrix

Mindestens geprüft werden:

- 350 × 550 Hochformat
- 390 × 844 Hochformat
- 430 × 932 Hochformat
- 550 × 350 Querformat
- 844 × 390 Querformat
- 932 × 430 Querformat

Zusätzlich werden sehr schmale Seitenverhältnisse, Display-Cutouts, vergrößerte Systemschrift und PWA-Vollbild geprüft.

