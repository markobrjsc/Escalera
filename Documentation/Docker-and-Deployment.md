# Docker und Bereitstellung

## Öffentlicher Einstiegspunkt

Der Client-/Nginx-Container ist der einzige öffentliche Dienst. PWA, API und Socket.IO verwenden dieselbe Origin. HTTP-Aufrufe laufen unter `/api`, WebSocket-Verbindungen unter `/socket.io`; der Serverport bleibt innerhalb des Docker-Netzes.

In Produktion terminiert ein vorgeschalteter Hosting-Proxy HTTPS und leitet `X-Forwarded-Proto` weiter. `CLIENT_ORIGIN` enthält die vollständige öffentliche HTTPS-Origin. Lokale und produktive Details stehen in `infrastructure/README.md`.

## Verbindliche Entscheidung

Alle Bestandteile von Escalera werden containerisiert. Docker ist kein optionales Hilfsmittel, sondern die festgelegte Entwicklungs- und Betriebsumgebung.

## Trennung von Client und Server

Der Client und der Server sind eigenständige Anwendungen:

- getrennte Quellordner
- getrennte Abhängigkeiten
- getrennte Build-Prozesse
- getrennte Dockerfiles
- getrennte Container
- getrennte Healthchecks
- unabhängig austausch- und skalierbar

Der Client enthält keine vertrauliche Spiellogik und keine Datenbankzugänge. Der Server enthält keine mobile Benutzeroberfläche.

## Lokale Umgebung

Docker Compose startet mindestens diese Dienste:

1. `client`
2. `server`
3. `postgres`
4. `redis`
5. `object-storage`

Für die lokale Entwicklung dürfen Quellordner eingebunden und automatische Neustarts verwendet werden. Die Produktionskonfiguration verwendet unveränderliche, vorab gebaute Images.

## Netzgrenzen

- Nur der öffentliche Einstiegspunkt ist von außen erreichbar.
- PostgreSQL, Redis und Objektspeicher bleiben in einem internen Docker-Netz.
- Der Client spricht ausschließlich über HTTPS/WSS mit dem Server.
- Datenbankmigrationen werden kontrolliert als eigener Deployment-Schritt ausgeführt.

## Konfiguration und Geheimnisse

- `.env.example` dokumentiert alle benötigten Werte ohne echte Zugangsdaten.
- `.env`, Schlüssel, Tokens und Produktionspasswörter werden niemals in Git gespeichert.
- Produktionsgeheimnisse werden über die Hosting-Umgebung oder Docker Secrets bereitgestellt.
- Entwicklungs- und Produktionswerte sind klar getrennt.

## Persistenz

- PostgreSQL erhält ein persistentes Volume und regelmäßige Sicherungen.
- Profilbilder liegen in einem persistenten S3-kompatiblen Speicher.
- Redis-Daten sind kurzlebig und dürfen entsprechend den Lobbyregeln ablaufen.
- Client- und Servercontainer speichern keine unverzichtbaren Daten im Containerdateisystem.

## Mindestprüfungen

Vor einer Bereitstellung müssen erfolgreich sein:

- Client-Build und Client-Tests
- Server-Build und Server-Tests
- Prüfung der Datenbankmigrationen
- Docker-Image-Builds
- Healthchecks aller Dienste
- Integrationstest des vollständigen Compose-Verbunds
- Prüfung auf versehentlich eingecheckte Geheimnisse
