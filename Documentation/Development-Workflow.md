# Ticket-, Branch- und Commit-Workflow

## Zweck

Dieser Workflow bestimmt die Zusammenarbeit für jede zukünftige Änderung am Escalera-Projekt.

## Grundsatz

Ab sofort bearbeiten wir standardmäßig nur noch GitHub-Tickets. Nur wenn ausdrücklich gesagt wird, dass eine Anfrage kein Ticket sein soll, weichen wir davon ab.

Die Zusammenarbeit findet immer im bestehenden Codex-Task statt. Ein einzelner Task darf mehrere Tickets nacheinander bearbeiten. Es ist kein neuer Prompt oder neuer Task erforderlich.

## Ablauf eines Tickets

| Schritt | Verantwortlich | Ergebnis |
|---:|---|---|
| 1 | Codex | Konkretes Ticket wird vorgeschlagen oder angelegt. |
| 2 | Nutzer | Gibt die Arbeit in natürlicher Sprache frei, zum Beispiel „Bearbeite #12“. |
| 3 | Codex | Erstellt einen Arbeitsbranch von `main`. |
| 4 | Beide | Klären Fragen und prüfen Zwischenergebnisse bis zur Zufriedenheit. |
| 5 | Codex | Prüft Änderungen und relevante Tests. |
| 6 | Nutzer | Gibt den Abschluss ausdrücklich frei. |
| 7 | Codex | Erstellt den Commit, pusht ihn und öffnet einen Pull Request. |
| 8 | Nutzer | Gibt den Merge ausdrücklich frei. |
| 9 | Codex | Mergt, löscht den Branch und schlägt nächste Tickets vor. |

`START #<Nummer>` ist weiterhin als Kurzform möglich, aber nicht verpflichtend.

## Branches

Jedes neu begonnene Arbeitspaket erhält einen Branch von `main`:

```text
ticket/<Nummer>-<kurzer-kebab-name>
```

Beispiel:

```text
ticket/12-realtime-lobby-erstellen
```

Mehrere inhaltlich eng zusammenhängende Tickets dürfen auf Wunsch auf demselben Branch liegen. Der Branchname bezieht sich dann auf das erste oder übergeordnete Ticket. Innerhalb eines einzelnen Codex-Tasks können Tickets sowohl auf getrennten als auch auf demselben Branch bearbeitet werden.

## Commits

- Ein Ticket entspricht genau einem Commit.
- Mehrere Tickets auf einem Branch erhalten daher mehrere klar getrennte Commits.
- Ein Commit darf keine Änderungen enthalten, die nicht zum Ticket gehören.
- Der Commit erfolgt erst, wenn die fachliche Arbeit vom Nutzer freigegeben wurde.

Format der Commit-Nachricht:

```text
<bereich>: <klare Kurzbeschreibung> (#<Nummer>)
```

Beispiel:

```text
docs: Spielregeln für Kartenkauf ergänzen (#12)
```

## Freigabepunkte

Es gibt zwei bewusst getrennte Freigabepunkte:

1. **Arbeitsfreigabe:** Eine eindeutige natürliche Freigabe erlaubt die Arbeit auf dem Ticket-Branch.
2. **Abschlussfreigabe:** erlaubt Commit, Push und Pull Request.
3. **Mergefreigabe:** erlaubt Merge nach `main` und das Löschen des Branches.

Die Freigabepunkte dürfen in einer einzigen Nachricht gebündelt werden. Wenn der Nutzer eindeutig Commit, Push, Merge und Branch-Löschung erlaubt, führt Codex diese Schritte ohne eine zusätzliche Nachricht aus.

Rückfragen stellt Codex kurz direkt im bestehenden Task. Ein spezielles Eingabefenster ist nicht erforderlich; jede natürliche Antwort des Nutzers kann eine Entscheidung oder Freigabe enthalten.

## Definition of Done

Ein Ticket gilt erst als fertig, wenn:

- seine Akzeptanzkriterien erfüllt sind,
- die Änderungen gemeinsam geprüft wurden,
- relevante Tests erfolgreich sind oder begründet nicht anwendbar sind,
- genau ein zugeordnetes Commit vorhanden ist,
- der Pull Request nach Nutzerfreigabe gemergt wurde,
- der Ticket-Branch lokal und remote gelöscht ist,
- das GitHub-Ticket abgeschlossen dokumentiert wurde.

## Nächste Arbeit

Nach jedem abgeschlossenen Ticket schlägt Codex zwei bis vier sinnvolle Folge-Tickets vor und wartet auf eine natürliche Arbeitsfreigabe. Es wird nicht automatisch ein weiteres Ticket begonnen.
