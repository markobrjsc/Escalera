# Escalera

Escalera ist ein geplantes mobiles Mehrspieler-Kartenspiel für iOS und Android. Es wird als installierbare Progressive Web App mit einem autoritativen Server umgesetzt.

## Aktueller Stand

Das Projekt befindet sich in der Anforderungs- und Planungsphase. Es ist noch kein Anwendungscode vorhanden.

Die fachlichen und technischen Entscheidungen befinden sich im Ordner [Documentation](Documentation/README.md).

## Geplante Bereiche

- `client/` – eigenständige mobile PWA
- `server/` – eigenständiges Backend und Spiellogik
- `packages/` – gemeinsam versionierte Verträge und reine Regelpakete
- `infrastructure/` – Docker- und Bereitstellungskonfiguration

Client und Server werden getrennt gebaut und in getrennten Dockercontainern ausgeführt.

