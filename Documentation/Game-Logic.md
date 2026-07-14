# Spiellogik

## Partiezustände

1. Lobby offen
2. alle Spieler bereit
3. Karten werden vorbereitet und verteilt
4. Runde aktiv
5. Runde wird gewertet und die gemeinsame Phase wird erhöht
6. nächste Runde wird vorbereitet
7. Partie beendet

## Zugzustände

1. Zug beginnt und Zugzeit läuft
2. Spieler zieht vom Nachzieh- oder Ablagestapel
3. Spieler darf gültige Kombinationen auslegen oder Karten anlegen
4. Spieler legt genau eine Handkarte auf den Ablagestapel
5. Zug endet und der nächste Spieler wird aktiv

Bei Zeitablauf gilt immer derselbe Abschluss: Ein nicht erfolgtes Ziehen wird automatisch nachgeholt, unbestätigte Kartenbewegungen werden zurückgesetzt und anschließend wird eine zufällige Handkarte abgeworfen. Bestätigte gültige Aktionen bleiben bestehen; Karten werden niemals automatisch ausgelegt oder angelegt.

## Auslegeprüfung

Vor dem ersten Auslegen in einer Phase muss die vollständige Phasenanforderung in einer Aktion erfüllt werden. Danach sind zusätzliche Kombinationen mit mindestens drei Karten sowie passende Einzelkarten an vorhandenen Kombinationen erlaubt.

Die Phasenanforderung ist eine Mindeststärke. Eine Kombination mit mehr passenden Karten ist gültig. Weitere Auslagen und Anlegeaktionen dürfen unmittelbar im selben Zug folgen.

Eine Kombination ist nur gültig, wenn:

- Kartenwerte und gegebenenfalls Farben zur Kombinationsart passen
- die erforderliche Kartenanzahl erreicht ist
- höchstens ein Joker enthalten ist
- bei zusätzlichen Straßen die in der Lobby gewählte Farbregel erfüllt ist

## Kartenkauf

Nach dem Abwerfen einer Karte entsteht ein zeitlich begrenztes Kaufangebot für die übrigen Spieler. Es endet spätestens, wenn der nächste aktive Spieler die Karte vom Ablagestapel zieht.

Ein gültiger Kauf kostet eine Münze und fügt die Karte der Hand des Käufers hinzu. Er ersetzt das verpflichtende Ziehen im nächsten eigenen Zug nicht. Bei mehreren Anfragen entscheidet die Reihenfolge, in der das Backend sie gültig verarbeitet. Nur die erste gültige Anfrage darf den Spielzustand verändern.

## Rundenwertung

Wenn ein Spieler keine Handkarten mehr besitzt:

1. endet die Runde
2. jede verbleibende Handkarte wird nach ihrem Kartenwert bewertet
3. die Werte werden je Spieler summiert
4. die Rundensumme wird zur Gesamtpunktzahl addiert
5. alle Spieler wechseln gemeinsam genau eine Phase weiter
6. die nächste Runde wird vorbereitet, sofern Phase 7 noch nicht beendet wurde

## Gemeinsamer Phasenfortschritt

- Alle Spieler starten gemeinsam in Phase 1.
- Für alle gilt dieselbe Pflichtkombination.
- Sobald ein Spieler die Phase beendet, wechseln nach der Rundenwertung alle gemeinsam genau eine Phase weiter.
- Es können sich keine Spieler in unterschiedlichen Phasen befinden.

## Zeitablauf und Verbindungsabbruch

Ist die Zugzeit abgelaufen oder ist der aktive Spieler nicht verbunden, wird sein Zug übersprungen. Ein getrennter Spieler darf innerhalb der zweiminütigen Lobby-Frist wieder beitreten und wird ab seinem nächsten regulären Zug berücksichtigt.

## Gewinner

Sobald ein Spieler die gemeinsame Phase 7 beendet, ist dies die letzte Runde. Nach ihrer vollständigen Wertung gewinnt die niedrigste Gesamtpunktzahl. Spieler mit gleicher Punktzahl teilen sich denselben Platz.

## Startspieler einer Runde

- Spieler mit den meisten bisherigen Strafpunkten
- bei Gleichstand: zufällige Auswahl aus den gleichplatzierten Spielern
- erste Runde: zufällige Auswahl, weil alle Spieler null Strafpunkte haben

## Leerer Nachziehstapel

Die Karten des Ablagestapels werden neu gemischt und bilden den neuen Nachziehstapel. Seine oberste Karte wird anschließend wieder offen auf den Ablagestapel gelegt.

## Noch erforderliche Logikregeln

- keine offenen Kernregeln in diesem Abschnitt
