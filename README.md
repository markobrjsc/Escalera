# Escalera

Escalera ist ein geplantes mobiles Mehrspieler-Kartenspiel für iOS und Android. Es wird als installierbare Progressive Web App mit einem autoritativen Server umgesetzt.

## Aktueller Stand

Das Projekt enthält ein lauffähiges technisches Grundgerüst. Die Spiellogik für Karten, Gruppen, Straßen, Phasen und Punkte liegt als getestetes gemeinsames Paket vor. Konten und Profilbilder werden serverseitig verwaltet. Die eigentliche Spieloberfläche und Echtzeit-Lobbys folgen in weiteren Tickets.

Die fachlichen und technischen Entscheidungen befinden sich im Ordner [Documentation](Documentation/README.md).

Die verbindliche Zusammenarbeit über Tickets, Branches und Commits ist in [Documentation/Development-Workflow.md](Documentation/Development-Workflow.md) beschrieben.

## Geplante Bereiche

- `client/` – eigenständige mobile PWA
- `server/` – eigenständiges Backend und Spiellogik
- `packages/` – gemeinsam versionierte Verträge und reine Regelpakete
- `infrastructure/` – Docker- und Bereitstellungskonfiguration

Client und Server werden getrennt gebaut und in getrennten Dockercontainern ausgeführt.

## Lokal starten

Voraussetzungen: Docker Desktop mit Docker Compose.

1. `.env.example` nach `.env` kopieren und die lokalen Zugangsdaten bei Bedarf ändern.
2. Den Verbund starten:

   ```powershell
   docker compose up --build
   ```

3. Client: `http://localhost:8080`
4. Server-Gesundheitsprüfung: `http://localhost:3000/health`
5. MinIO-Konsole: `http://localhost:9001`

Der Verbund startet getrennte Container für Client, Server, PostgreSQL, Redis und lokalen Objektspeicher.

## Entwickeln mit Hot Reload

`docker compose up` baut den Client fest in das nginx-Image ein. Änderungen an Quellcode oder Styles werden dort erst nach einem Neubau sichtbar (`docker compose up -d --build client`); ein blosser Neustart des Containers genügt nicht.

Für die tägliche Arbeit gibt es deshalb ein Entwicklungs-Overlay, das den Client von Vite ausliefern lässt:

```powershell
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Der Client bleibt unter `http://localhost:8080`. Änderungen an `client/src` sind sofort sichtbar, Styles werden ohne Neuladen der Seite ausgetauscht.

Zurück in den Produktionsmodus:

```powershell
docker compose up -d --build client
```

### Wenn Änderungen trotzdem nicht ankommen

Der Produktionsbuild registriert einen Service Worker, der die Anwendung zwischenspeichert. Weil `registerType: "prompt"` gesetzt ist, übernimmt eine neue Version erst, wenn **alle** Tabs dieser Adresse geschlossen wurden — ein normales Neuladen genügt nicht. Sofort erzwingen: DevTools → Application → Service Workers → *Unregister*, danach neu laden. Im Entwicklungs-Overlay wird kein Service Worker registriert.

## Qualität prüfen

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
docker compose build
```
