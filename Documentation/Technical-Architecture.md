# Technische Architektur

## Architekturentscheidung

Escalera verwendet eine Client-Server-Architektur mit einem autoritativen Backend. Der Client zeigt den Zustand an und sendet Spielabsichten. Nur der Server entscheidet, ob eine Aktion erlaubt ist, verändert den verbindlichen Spielzustand und verteilt das Ergebnis an die Clients.

## Festgelegter Technologiestack

### Gemeinsame Basis

- TypeScript für Client, Server und gemeinsam genutzte Spieltypen
- Monorepository mit getrennten Anwendungen und gemeinsamem Regelpaket
- automatisierte Formatierung, statische Prüfungen und Tests

### Mobile PWA

- React für Benutzeroberfläche und Zustandsdarstellung
- Vite für Entwicklung und Erstellung der auslieferbaren App
- Web-App-Manifest und Service Worker für Installation, App-Symbol und Aktualisierung
- responsive HTML-/CSS-Oberfläche statt Game-Engine
- sichere Bildschirmränder und Touch-Eingaben für mobile Geräte

Der Service Worker darf nur statische App-Ressourcen zwischenspeichern. Authentifizierte Antworten, private Handkarten und vollständige Spielzustände werden ausdrücklich vom dauerhaften Cache ausgeschlossen. Ein vorbereitetes Update erzwingt während einer Partie keinen Neustart.

### Backend

- Node.js mit TypeScript
- NestJS als strukturierter Serverrahmen
- Socket.IO über WebSockets für Lobby-, Spiel- und Präsenzereignisse
- HTTP-Endpunkte für Anmeldung, Profil, Profilbilder und initiale App-Daten

### Daten und Dateien

- PostgreSQL als dauerhafte Hauptdatenbank
- Redis für kurzfristige Lobbyzustände, Anwesenheit, Zeitlimits, Sperren und automatische Ablaufzeiten
- S3-kompatibler Objektspeicher für geprüfte Profilbilder
- Datenbankzugriff über Prisma

### Betrieb

- Docker ist für lokale Entwicklung, Tests und produktiven Betrieb verpflichtend.
- Client und Server werden getrennt gebaut, versioniert und als getrennte Container ausgeführt.
- Separate Container für Client-Auslieferung, Server, PostgreSQL, Redis und lokale S3-kompatible Bildspeicherung.
- Docker Compose startet den vollständigen lokalen Verbund mit einem Befehl.
- Jeder eigene Container besitzt ein eigenes Dockerfile und einen Healthcheck.
- HTTPS/WSS für sämtliche Verbindungen
- gleiche Domain für PWA und API, um Anmeldung und Sicherheitsregeln zu vereinfachen
- automatisierte Datenbanksicherungen für dauerhafte Konto- und Statistikdaten

## Projektstruktur

```text
client/          eigenständige installierbare PWA mit eigenem Dockerfile
server/          eigenständiges HTTP- und Echtzeit-Backend mit eigenem Dockerfile
packages/
  game-rules/    reine und gemeinsam getestete Regeldefinitionen
  contracts/     Befehle, Ereignisse und Datentypen
  ui/            wiederverwendbare Oberflächenbausteine
infrastructure/  Docker, Reverse Proxy und Betriebsdateien
```

Client und Server dürfen keine gemeinsame Laufzeit oder denselben Container verwenden. Gemeinsam genutzt werden ausschließlich versionierte Typen, Verträge und reine Spiellogikpakete zur Entwicklungszeit.

## Docker-Verbund

Der lokale Verbund enthält mindestens:

| Dienst | Aufgabe | Dauerhafte Daten |
|---|---|---|
| `client` | Auslieferung der gebauten PWA | nein |
| `server` | API, WebSocket und autoritative Spiellogik | nein |
| `postgres` | Konten, Statistiken und dauerhafte Daten | ja |
| `redis` | Lobbys, Präsenz, Timer und Ablaufzeiten | kurzlebig |
| `object-storage` | lokale Profilbildspeicherung | ja |

Zugangsdaten werden über nicht eingecheckte Umgebungsvariablen beziehungsweise Secrets bereitgestellt. Images werden mehrstufig gebaut, laufen ohne Root-Rechte und enthalten nur notwendige Produktionsabhängigkeiten.

## Verbindlicher Spielfluss

```text
Client sendet Befehl
        ↓
Server prüft Sitzung, Lobby, Zug, Version und Spielregel
        ↓
Server führt erlaubte Änderung atomar aus
        ↓
Server speichert neuen Zustand beziehungsweise Ereignis
        ↓
Server sendet bestätigtes Ergebnis an berechtigte Clients
```

Beispiele für Befehle sind `Karte ziehen`, `Kombination auslegen`, `Karte kaufen` und `Zug beenden`.

## Autoritativer Server

Der Client darf niemals selbst verbindlich:

- Karten mischen oder austeilen
- fremde Handkarten kennen
- Spielzüge als gültig erklären
- Timer abschließen
- Kartenkäufe priorisieren
- Punkte, Phasen oder Erfolge vergeben

Mischen und zufällige Entscheidungen erfolgen serverseitig. Jeder Client erhält nur öffentliche Daten und seine eigenen privaten Handkarten.

## Befehle und Synchronisation

Jeder Client-Befehl enthält:

- eindeutige Befehlskennung gegen doppelte Verarbeitung
- erwartete Spielzustandsversion
- Befehlstyp und notwendige Nutzdaten
- authentifizierte Sitzung, nicht frei übertragene Benutzerkennung

Der Server antwortet mit Annahme oder Ablehnung und einer neuen Zustandsversion. Veraltete Clients erhalten einen aktuellen, für sie gefilterten Zustand. Nach einem Wiedereintritt wird immer ein vollständiger autorisierter Zustand geladen.

## Gleichzeitige Aktionen

Kritische Aktionen werden atomar verarbeitet. Das gilt insbesondere für konkurrierende Kartenkäufe. Die erste gültig serverseitig verarbeitete Anfrage gewinnt; alle folgenden Anfragen werden ohne Teiländerung abgelehnt.

## Datenlebensdauer

- Konten, Profilbilder, Statistiken und Erfolge: dauerhaft bis zur Löschung des Kontos
- aktive Lobby und Partie: solange sie aktiv sind
- Lobby-Wiedereintritt: zwei Minuten gemäß Spielregel
- beendete oder abgelaufene Lobby einschließlich detailliertem Spielzustand: höchstens fünf Minuten
- danach: vollständige Löschung der Lobby- und Handkartendaten
- dauerhaft erhalten bleibt nur eine verdichtete, nicht wieder spielbare Statistikzusammenfassung

## Tests

- Unit-Tests für jede Spielregel und Kartenkombination
- generative Tests für Deck, Kartenbesitz und Punkteinvarianten
- Integrationstests für Datenbank, Anmeldung und WebSocket-Befehle
- Mehrclient-Tests für gleichzeitige Käufe, Zeitablauf und Wiedereintritt
- End-to-End-Tests auf mobilen Browsern
- manuelle Tests auf mindestens einem realen iPhone/iPad und mehreren Android-Geräten vor Veröffentlichung

## Quellen

- [NestJS: WebSocket-Gateways](https://docs.nestjs.com/websockets/gateways)
- [PostgreSQL: Transaktionsverarbeitung](https://www.postgresql.org/docs/current/transactions.html)
- [OWASP: sichere Passwortspeicherung](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
