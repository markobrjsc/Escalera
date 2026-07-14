# Spielregeln

## Spielziel

Eine Partie besteht aus sieben gemeinsamen Phasen. Alle Spieler spielen in einer Runde dieselbe Phase und damit dieselbe geforderte Kartenkombination.

Eine Runde endet, sobald ein Spieler alle Handkarten abgelegt hat. Die übrigen Spieler erhalten Minuspunkte entsprechend den Karten, die sie noch auf der Hand halten. Nach Abschluss aller sieben Phasen gewinnt der Spieler mit der niedrigsten Gesamtpunktzahl.

Sobald ein Spieler die aktuelle Phase erfolgreich beendet, wechseln nach Abschluss der Runde alle Spieler gemeinsam in die nächste Phase. Es gibt keinen individuellen Phasenfortschritt.

## Spielerzahl

- 2 bis 6 Spieler
- ausschließlich Mehrspieler
- eine Partie findet innerhalb einer Lobby statt

## Kartenset

- zwei vollständige französische Kartensätze mit jeweils 52 Karten
- Kartenwerte von 2 bis Ass in vier Farben beziehungsweise Zeichen
- standardmäßig ein zusätzlicher Joker pro Spieler
- die Jokeranzahl soll in den Lobby-Einstellungen erhöht oder verringert werden können

## Münzen

Jeder Spieler erhält zu Beginn sieben Münzen. Die Münzen werden verwendet, um abgelegte Karten zu kaufen.

Ein Kartenkauf kostet genau eine Münze. Der Käufer nimmt nur die gekaufte Karte auf die Hand und zieht dabei keine weitere Karte. Wenn er später regulär am Zug ist, muss er trotzdem wie üblich eine Karte ziehen; der Kauf ersetzt das Ziehen im eigenen Zug nicht.

Die ausgegebene Münze wird entfernt und keinem anderen Spieler gutgeschrieben.

## Vorbereitung

1. Alle Spieler treten einer Lobby bei.
2. Der Gastgeber legt die Spieleinstellungen fest.
3. Alle Spieler markieren sich als bereit.
4. Die Partie startet erst, wenn alle Spieler bereit sind.
5. Das Spiel mischt die Karten und teilt automatisch jedem Spieler elf Handkarten aus.
6. Die oberste verbleibende Karte wird offen als erste Karte des Ablagestapels ausgelegt.
7. Jeder Spieler erhält sieben Münzen.

Es gibt keinen spielergesteuerten Kartengeber. Zu Beginn jeder Runde startet der Spieler mit den meisten bisherigen Strafpunkten. Haben mehrere Spieler gleich viele höchste Strafpunkte, wird der Startspieler zufällig aus diesen Spielern gewählt. In der ersten Runde besitzen alle null Strafpunkte, weshalb der Startspieler zufällig bestimmt wird.

## Ablauf eines Zuges

Der festgelegte Startspieler beginnt. Ein vollständiger Zug besteht grundsätzlich aus:

1. eine Karte vom Nachziehstapel oder – sofern noch verfügbar – vom Ablagestapel ziehen
2. erlaubte Kombinationen auslegen oder Karten an bestehende Kombinationen anlegen
3. eine Handkarte offen auf den Ablagestapel legen
4. den Zug beenden

Für das Ablegen der letzten Karte und damit das Beenden des Zuges kann eine Bestätigung aktiviert werden. Diese Bestätigung kann in den Einstellungen deaktiviert werden.

In den Lobby-Einstellungen kann eine maximale Zugzeit festgelegt werden. Läuft sie ab, wird der Zug immer nach derselben Regel automatisch beendet:

- Hat der Spieler noch keine Karte gezogen, zieht das Spiel automatisch eine Karte vom Nachziehstapel.
- Bereits bestätigte gültige Aktionen bleiben bestehen.
- Nicht bestätigte Kartenbewegungen werden verworfen und auf den letzten gültigen Zustand zurückgesetzt.
- Anschließend wird eine zufällige Handkarte auf den Ablagestapel gelegt.
- Es werden keine möglichen Kombinationen oder Anlegeaktionen automatisch vorgenommen.

## Karten kaufen

Während ein Spieler am Zug ist, dürfen andere Spieler die von ihm auf den Ablagestapel gelegte Karte kaufen. Ein Kauf ist nur möglich, solange der nun aktive Spieler diese Karte noch nicht selbst vom Ablagestapel genommen hat.

Bei mehreren Kaufinteressenten erhält der Spieler die Karte, dessen gültige Kaufanfrage zuerst vom Backend empfangen und verarbeitet wird. Die Karte darf nur einmal vergeben werden.

## Auslegen

Ein Spieler darf in einer Phase erstmals Karten auslegen, wenn er die für diese Phase geforderte Kombination vollständig besitzt.

Nach Erfüllung der Phasenkombination darf er im selben oder in späteren Zügen:

- weitere gültige Kombinationen mit mindestens drei Karten auslegen
- einzelne passende Karten an bereits auf dem Tisch liegende Kombinationen anlegen

Bei Gruppen gleicher Kartenwerte ist die Kartenfarbe egal. Doppelte Kartenwerte derselben Farbe sind erlaubt, weil mit zwei Kartensätzen gespielt wird.

## Phasen

| Phase | Geforderte Kombination |
|---:|---|
| 1 | drei gleiche Kartenwerte |
| 2 | zweimal drei gleiche Kartenwerte |
| 3 | vier gleiche Kartenwerte |
| 4 | zweimal vier gleiche Kartenwerte |
| 5 | fünf gleiche Kartenwerte |
| 6 | zweimal fünf gleiche Kartenwerte |
| 7 | Escalera: eine Straße aus sieben Karten derselben Farbe |

## Straßen

Für Phase 7 müssen alle sieben Karten der Straße dieselbe Farbe besitzen.

Für zusätzlich ausgelegte Straßen soll über eine Lobby-Einstellung bestimmt werden können, ob sie dieselbe Farbe besitzen müssen oder farbunabhängig sein dürfen.

Das Ass darf sowohl unterhalb der 2 als auch oberhalb des Königs verwendet werden. Die Kartenwerte bilden für Straßen einen Kreis: Nach dem Ass darf wieder die 2 folgen.

Innerhalb einer Straße darf jeder Kartenwert höchstens einmal vorkommen, auch wenn zwei Kartensätze verwendet werden. Dadurch besitzt eine Straße höchstens 13 Karten und schließt maximal einen vollständigen Kreis. Das Ass oder ein anderer Wert darf am Ende nicht wiederholt werden.

## Joker

- Ein Joker kann jede fehlende Karte einer Kombination ersetzen.
- Pro Kombination ist höchstens ein Joker erlaubt.
- Ein ausgelegter Joker darf nicht ausgetauscht, aufgenommen oder erneut verwendet werden.

## Kartenwerte und Punkte

| Handkarte | Punkte |
|---|---:|
| 2 bis 7 | 5 |
| 8, 9 und 10 | 10 |
| Bube, Dame und König | 10 |
| Ass | 15 |
| Joker | 30 |

Nur die beim Rundenende noch auf der Hand befindlichen Karten werden gewertet.

## Runden- und Spielende

Eine Runde endet, sobald ein Spieler alle Handkarten abgelegt hat. Danach werden die Punkte der übrigen Handkarten ermittelt und zur Gesamtpunktzahl addiert.

Nach der Rundenwertung wechseln alle Spieler gemeinsam genau eine Phase weiter, sobald mindestens ein Spieler die aktuelle Phase erfolgreich beendet hat. Kein Spieler bleibt in einer niedrigeren Phase zurück.

Die Partie endet nach der Runde, in der mindestens ein Spieler die gemeinsame Phase 7 erfolgreich beendet hat. Die Rundenwertung wird noch vollständig durchgeführt. Anschließend gewinnt der Spieler mit der niedrigsten Gesamtpunktzahl.

Bei gleicher Gesamtpunktzahl erhalten die betroffenen Spieler denselben Platz. Es gibt keine zusätzliche Entscheidungsrunde.

## Leerer Nachziehstapel

Ist der Nachziehstapel leer, werden die Karten des Ablagestapels neu gemischt und zum neuen Nachziehstapel. Danach wird dessen oberste Karte wieder offen als neue Startkarte des Ablagestapels ausgelegt.

## Verbindungsabbruch

Ein nicht verbundener Spieler wird bei seinen Zügen übersprungen. Er bleibt Teilnehmer der laufenden Partie und darf innerhalb von zwei Minuten wieder derselben Lobby und Partie beitreten. Nach dem Wiedereintritt nimmt er ab seinem nächsten regulären Zug wieder teil.

Eine Lobby ohne verbundene Spieler bleibt zwei Minuten erhalten. Ist nur noch ein Spieler verbunden und innerhalb von zwei Minuten kehrt kein weiterer Spieler zurück, wird die Lobby gelöscht und der verbleibende Spieler aus der Lobby- beziehungsweise Spielansicht herausnavigiert.

## Stärke einer Phasenkombination

Die geforderte Kombination ist eine Mindestanforderung und muss vollständig in einem Vorgang ausgelegt werden. Eine stärkere Kombination ist erlaubt, beispielsweise vier gleiche Karten in Phase 1 statt der geforderten drei oder eine Escalera mit zehn statt sieben Karten.

Nach dem erfolgreichen erstmaligen Auslegen darf der Spieler noch im selben Zug zusätzliche Kombinationen auslegen und Karten an bestehende Kombinationen anlegen.
