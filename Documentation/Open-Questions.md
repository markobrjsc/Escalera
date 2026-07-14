# Offene Fragen

## Spielregeln

Die bisher besprochenen Kernregeln sind geklärt. Neue Sonderfälle werden hier ergänzt, sobald sie bei der weiteren Planung oder beim Testen auffallen.

## Produktentscheidungen – noch später zu verfeinern

- konkrete Hosting-Plattform und Domain
- endgültige Mindestversionen für iOS und Android nach Gerätetests
- konkrete Namen, Stufen und Symbole des Erfolgsbaums
- Gestaltung des Tutorials

## Bereits entschieden

| Datum | Entscheidung | Begründung |
|---|---|---|
| 14.07.2026 | 2 bis 6 Spieler, ausschließlich Mehrspieler | Festgelegter Spielumfang |
| 14.07.2026 | Sieben gemeinsame Phasen | Sobald einer eine Phase beendet, wechseln alle Spieler gemeinsam weiter |
| 14.07.2026 | Zwei Kartensätze plus standardmäßig ein Joker je Spieler | Festgelegtes Spielmaterial |
| 14.07.2026 | Elf Startkarten und sieben Münzen je Spieler | Festgelegte Startausstattung |
| 14.07.2026 | Partie startet erst bei Bereitschaft aller Spieler | Gewünschter Lobby-Ablauf |
| 14.07.2026 | Nach erfolgreichem Abschluss der gemeinsamen Phase 7 gewinnt die niedrigste Gesamtpunktzahl | Rundenwertung wird vorher vollständig beendet |
| 14.07.2026 | Punktegleichstand ergibt denselben Platz | Keine zusätzliche Entscheidungsrunde |
| 14.07.2026 | Keine Rückgängig-Funktion | Abgeschlossene Aktionen bleiben verbindlich |
| 14.07.2026 | Karten werden automatisch ausgeteilt | Es gibt keinen spielergesteuerten Kartengeber |
| 14.07.2026 | Der Spieler mit den meisten Strafpunkten beginnt die Runde | Bei Gleichstand entscheidet eine zufällige Auswahl |
| 14.07.2026 | Kartenkauf kostet eine Münze und ersetzt das spätere Ziehen nicht | Kauf findet außerhalb des eigenen Zuges statt |
| 14.07.2026 | Ausgegebene Kaufmünzen werden entfernt | Münzen werden keinem Spieler übertragen |
| 14.07.2026 | Erste gültige Backend-Anfrage gewinnt einen konkurrierenden Kartenkauf | Eindeutige Auflösung gleichzeitiger Anfragen |
| 14.07.2026 | Ass darf niedrig und hoch verwendet werden | Kartenwerte bilden für Straßen einen Kreis |
| 14.07.2026 | Jeder Kartenwert darf in einer Straße nur einmal vorkommen | Maximal 13 Karten und höchstens ein geschlossener Wertekreis |
| 14.07.2026 | Ausgelegte Joker dürfen nicht ausgetauscht werden | Kombinationen bleiben nach dem Auslegen stabil |
| 14.07.2026 | Leerer Nachziehstapel wird aus dem neu gemischten Ablagestapel erneuert | Partie kann ohne Kartenmangel weiterlaufen |
| 14.07.2026 | Zeitablauf führt nötigenfalls zu automatischem Ziehen und anschließend zufälligem Abwerfen | Behandlung ist unabhängig von möglichen Spielaktionen gleich |
| 14.07.2026 | Nicht bestätigte Kartenbewegungen werden bei Zeitablauf zurückgesetzt | Nur gültig bestätigte Aktionen bleiben bestehen |
| 14.07.2026 | Spieler werden bei Zeitablauf oder Verbindungsabbruch übersprungen | Partie kann ohne Blockade fortgesetzt werden |
| 14.07.2026 | Getrennte Spieler dürfen innerhalb von zwei Minuten wieder beitreten | Fortschritt und Teilnahme bleiben während der Lobby-Frist erhalten |
| 14.07.2026 | Lobby-Frist bei fehlenden Mitspielern beträgt zwei Minuten | Danach wird die Lobby gelöscht |
| 14.07.2026 | Phasenkombination muss auf einmal ausgelegt werden, darf aber stärker sein | Geforderte Kartenanzahl ist eine Mindestanforderung |
| 14.07.2026 | Nach der Pflichtkombination darf im selben Zug weiter ausgelegt werden | Erfolgreicher Zug muss nicht sofort enden |
| 15.07.2026 | Installierbare PWA mit einer Codebasis | Gleiche mobile App auf iOS und Android ohne Store-Verteilung |
| 15.07.2026 | Vollbild beziehungsweise Standalone ohne Browserleisten | Wesentliche Voraussetzung für das Spielerlebnis |
| 15.07.2026 | TypeScript, React, NestJS, Socket.IO, PostgreSQL und Redis | Einheitlicher, echtzeitfähiger Client-Server-Stack |
| 15.07.2026 | Autoritatives Backend | Alle Spielaktionen werden zentral geprüft und verteilt |
| 15.07.2026 | Konto wird anhand von Benutzername und Passwort registriert oder angemeldet | Minimaler gewünschter Kontoablauf |
| 15.07.2026 | Argon2id-Passwortspeicherung | Passwörter dürfen nie lesbar gespeichert werden |
| 15.07.2026 | Optionales Profilbild, dauerhafte Statistiken und Erfolgsbaum | Gewünschter Profilumfang |
| 15.07.2026 | Überspringbares Tutorial nach erster Registrierung | Einführung ohne Pflichtanleitung |
| 15.07.2026 | Detaillierte abgelaufene Lobbys höchstens fünf Minuten speichern | Keine dauerhafte Speicherung von Partiezuständen |
| 15.07.2026 | Keine Passwortwiederherstellung | Spieler sind selbst für die sichere Aufbewahrung ihres Passworts verantwortlich |
| 15.07.2026 | Client und Server sind getrennte Anwendungen | Klare Verantwortungs- und Bereitstellungsgrenzen |
| 15.07.2026 | Docker ist für Entwicklung und Betrieb verpflichtend | Reproduzierbare Umgebung für alle Bestandteile |
