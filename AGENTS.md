# Verbindliche Arbeitsweise

Diese Regeln gelten für alle Arbeiten im Repository Escalera.

## Branch-Modell (WICHTIG)

- **`development`** ist der Standard- und Integrationsbranch. Alle Ticket-/Feature-Branches gehen von `development` aus und per Pull Request wieder zurück nach `development`.
- **`main`** ist ausschließlich der Release- und Produktionsbranch. **Jeder Merge nach `main` löst automatisch ein Live-Produktions-Deployment aus** (`.github/workflows/production-deploy.yml`).
- **Niemals direkt nach `main` mergen oder pushen.** Nach `main` gelangt Code nur über einen bewussten Sammel-Release-PR `development` → `main`, und nur nach ausdrücklicher Nutzerfreigabe.
- Ein Release nach `main` erfolgt erst, wenn auf `development` genug geprüfte Änderungen zusammengekommen sind.

## Ticketpflicht

- Standardmäßig wird ausschließlich an GitHub-Tickets gearbeitet.
- Eine Anfrage ohne Ticket wird zuerst als konkreter Ticketvorschlag formuliert.
- Die Arbeit beginnt nach einer eindeutigen Freigabe in natürlicher Sprache, zum Beispiel „Bearbeite #12“ oder „Starte die Tickets #12 und #13“.
- `START #<Nummer>` bleibt eine mögliche Kurzform, ist aber nicht verpflichtend.
- Eine Ausnahme gilt nur, wenn der Nutzer ausdrücklich erklärt, dass die Anfrage kein Ticket ist.
- Die Zusammenarbeit bleibt im bestehenden Codex-Task; ein neuer Task oder Prompt ist nicht erforderlich.
- Ein einzelner Codex-Task darf mehrere Tickets nacheinander bearbeiten.

## Start eines Tickets

1. Ticket prüfen oder bei Bedarf anlegen.
2. Ziel, Umfang und Akzeptanzkriterien kurz bestätigen.
3. Einen Branch von aktuellem `development` erstellen: `ticket/<Nummer>-<kurzer-name>`.
4. Den Branch und den Beginn der Arbeit im bestehenden Task mitteilen.

Bei mehreren Tickets im selben Task wird klar benannt, welches Ticket gerade aktiv ist. Eng zusammenhängende Tickets dürfen nach Nutzerwunsch auf demselben Branch bearbeitet werden.

## Umsetzung und Rückfragen

- Nur Änderungen umsetzen, die zum aktiven Ticket gehören.
- Notwendige fachliche oder technische Entscheidungen mit dem Nutzer in kurzen Rückfragen im bestehenden Task klären.
- Zwischenergebnisse knapp vorstellen und iterieren, bis der Nutzer zufrieden ist.
- Keine eigenmächtigen Pushes, Merges oder Branch-Löschungen.
- Ein separates Eingabefenster wird nicht vorausgesetzt; natürliche Antworten des Nutzers genügen.

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
4. Pull Request zum `development`-Branch öffnen (niemals direkt nach `main`).
5. Erst nach ausdrücklicher Freigabe des Nutzers nach `development` mergen.
6. Danach den Ticket-Branch lokal und auf GitHub löschen.
7. Den Abschluss im Ticket dokumentieren und passende nächste Tickets vorschlagen.

Eine ausdrückliche Freigabe darf mehrere Schritte in einer Nachricht erlauben, beispielsweise: „Wenn die Prüfung sauber ist, committe, pushe, merge und lösche den Branch.“ In diesem Fall werden genau diese Schritte ohne zusätzliche Rückfrage ausgeführt.

## Release nach `main`

Ein Release wird nur auf ausdrücklichen Wunsch des Nutzers vorbereitet:

1. Sicherstellen, dass `development` grün ist (CI: Tests, Typprüfung, Build).
2. Einen Pull Request `development` → `main` öffnen.
3. Erst nach ausdrücklicher Nutzerfreigabe mergen — dieser Merge deployt automatisch live in die Produktion.
4. Den anschließenden Deploy-Lauf überwachen und den Health-Check bestätigen.

Kein Agent merged eigenmächtig nach `main`.

## Nächstes Ticket

Am Ende jeder Ticketbearbeitung werden zwei bis vier konkrete nächste Tickets vorgeschlagen. Danach wird auf eine natürliche Arbeitsfreigabe gewartet; es wird nicht automatisch ein weiteres Ticket begonnen.
