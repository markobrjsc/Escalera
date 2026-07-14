# Verbindliche Arbeitsweise

Diese Regeln gelten für alle Arbeiten im Repository Escalera.

## Ticketpflicht

- Standardmäßig wird ausschließlich an GitHub-Tickets gearbeitet.
- Eine Anfrage ohne Ticket wird zuerst als konkreter Ticketvorschlag formuliert.
- Erst nach der ausdrücklichen Eingabe `START #<Nummer>` beginnt die Arbeit.
- Eine Ausnahme gilt nur, wenn der Nutzer ausdrücklich erklärt, dass die Anfrage kein Ticket ist.
- Die Zusammenarbeit bleibt im bestehenden Codex-Task; ein neuer Task oder Prompt ist nicht erforderlich.

## Start eines Tickets

1. Ticket prüfen oder bei Bedarf anlegen.
2. Ziel, Umfang und Akzeptanzkriterien kurz bestätigen.
3. Einen Branch von aktuellem `main` erstellen: `ticket/<Nummer>-<kurzer-name>`.
4. Den Branch und den Beginn der Arbeit im Task mitteilen.

## Umsetzung und Rückfragen

- Nur Änderungen umsetzen, die zum aktiven Ticket gehören.
- Notwendige fachliche oder technische Entscheidungen mit dem Nutzer klären.
- Zwischenergebnisse knapp vorstellen und iterieren, bis der Nutzer zufrieden ist.
- Keine eigenmächtigen Pushes, Merges oder Branch-Löschungen.

## Commits

- Jedes Ticket erhält genau einen eigenen Commit.
- Enthält ein Branch mehrere Tickets, erhält jedes Ticket einen getrennten Commit.
- Commits enthalten keine unzusammenhängenden Änderungen.
- Der Ticket-Commit wird erst nach fachlicher Freigabe vorbereitet und erstellt.
- Commit-Nachrichten folgen dem Muster: `<bereich>: <klare Kurzbeschreibung> (#<Nummer>)`.

## Abschluss eines Tickets

Nach der Nutzerfreigabe:

1. Änderungen und relevante Tests prüfen.
2. Den einen Ticket-Commit erstellen.
3. Branch nach GitHub pushen.
4. Pull Request zum `main`-Branch öffnen.
5. Erst nach ausdrücklicher Freigabe des Nutzers mergen.
6. Danach den Ticket-Branch lokal und auf GitHub löschen.
7. Den Abschluss im Ticket dokumentieren und passende nächste Tickets vorschlagen.

## Nächstes Ticket

Am Ende jeder Ticketbearbeitung werden zwei bis vier konkrete nächste Tickets vorgeschlagen. Danach wird auf `START #<Nummer>` gewartet; es wird nicht automatisch ein weiteres Ticket begonnen.
