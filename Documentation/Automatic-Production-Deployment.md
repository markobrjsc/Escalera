# Automatisches Produktions-Deployment

## Zweck

Der Workflow ".github/workflows/production-deploy.yml" prüft jeden Pull Request und jeden Push auf "main". Nur ein erfolgreicher Lauf auf "main" darf die Produktionsumgebung aktualisieren.

## Qualitätsbarriere

Vor jedem Deployment werden mit der gesperrten "package-lock.json" folgende Schritte ausgeführt:

1. Abhängigkeiten mit "npm ci" installieren
2. vollständige Tests ausführen
3. TypeScript-Typprüfung ausführen
4. Produktions-Build für Client und Server erzeugen

Ein Fehler beendet den Workflow vor dem Serverzugriff.

## GitHub-Konfiguration

Folgende Repository-Variablen werden benötigt:

- "PRODUCTION_HOST": öffentliche IP oder Hostname des Servers
- "PRODUCTION_USER": SSH-Benutzer für das Deployment
- "PRODUCTION_URL": öffentliche HTTPS-Origin ohne abschließenden Schrägstrich

Folgende Repository-Secrets werden benötigt:

- "PRODUCTION_SSH_KEY_B64": privater Ed25519-Schlüssel des Deployment-Benutzers, Base64-kodiert
- "PRODUCTION_KNOWN_HOSTS": fest gepinnter Ed25519-Hostschlüssel im OpenSSH-Format

Private Schlüssel, Hostzugang und ".env.production" werden nie in das Repository oder in Build-Artefakte aufgenommen.

## Ablauf auf dem Server

1. GitHub erstellt ein Archiv der exakten "main"-Commit-ID und berechnet SHA-256.
2. Archiv und Deployment-Skript werden per SSH übertragen.
3. Der Server prüft Commit-ID, Archiv-Hash und Archivpfade.
4. Eine Serversperre verhindert parallele Deployments.
5. Das bestehende Backup-Service wird erfolgreich ausgeführt.
6. Die aktuellen Client- und Server-Images werden als Rollback markiert.
7. Neue Images werden zunächst in einem getrennten Release-Verzeichnis gebaut.
8. Erst danach wird das Release aktiviert und die Container werden ersetzt.
9. Der öffentliche HTTPS-Health-Check muss erfolgreich sein.

Schlägt die Aktivierung oder der Health-Check fehl, stellt das Skript Quellverzeichnis und Container-Images der vorherigen Version wieder her.

## Manueller Start

Der Workflow kann in GitHub Actions zusätzlich über "workflow_dispatch" auf "main" manuell gestartet werden. Auch dabei gelten dieselben Tests, Sperren, Backups und Health-Checks.

## Optionales Freigabe-Gate

Der Deploy-Job läuft in der GitHub-Umgebung "production". Solange dort keine Schutzregeln hinterlegt sind, deployt jeder erfolgreiche "main"-Merge automatisch. Wer ein manuelles Vier-Augen-Prinzip möchte, hinterlegt in den Repository-Einstellungen unter "Environments → production" einen "Required reviewer". Danach pausiert jedes Deployment bis zur ausdrücklichen Freigabe – ganz ohne Codeänderung.

## Server-Voraussetzungen

Das Deployment ersetzt nur Anwendungscode und Container-Images. Die eigentliche Produktionskonfiguration liegt dauerhaft unter "/opt/escalera" auf dem Server und wird nicht aus dem Repository überschrieben. Vorhanden sein müssen:

- "/opt/escalera/.env.production"
- "/opt/escalera/docker-compose.production.yml"
- "/opt/escalera/infrastructure/nginx.conf" bzw. "Caddyfile"
- ein systemd-Dienst "escalera-backup.service" für das Datenbackup

Fehlt eine dieser Dateien, bricht das Deployment vor jeder Änderung kontrolliert ab; die laufende Version bleibt unberührt.

## Sicherheitshinweis Root-Zugang

Der Deployment-Benutzer benötigt Root-Rechte, weil das Skript Container ersetzt, den Backup-Dienst startet und bei Fehlern zurückrollt. Empfohlene Absicherung des dedizierten Schlüssels auf dem Server:

- eigener Deployment-Schlüssel, nicht der persönliche Administrationsschlüssel
- in "authorized_keys" per "command=" auf genau dieses Deployment-Skript beschränken sowie "no-port-forwarding,no-agent-forwarding,no-x11-forwarding,no-pty" setzen
- Zugriff auf die feste Runner-Herkunft einschränken, soweit die Infrastruktur das erlaubt

So kann der Schlüssel selbst bei einer Kompromittierung der Pipeline ausschließlich das vorgesehene Deployment auslösen und keine beliebigen Root-Befehle ausführen.
