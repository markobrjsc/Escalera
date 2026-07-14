# Infrastruktur

Die Dockerfiles liegen direkt bei Client und Server. Die Compose-Konfiguration im Projektstamm startet Client, Server, PostgreSQL, Redis und MinIO für die lokale Entwicklung.

Docker ist für Entwicklung, Tests und Betrieb verpflichtend. Zugangsdaten gehören ausschließlich in die lokale `.env` oder in Produktions-Secrets.
