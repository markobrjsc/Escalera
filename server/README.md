# Escalera Server

Der Server ist eine eigenständige NestJS-Anwendung und wird in einem eigenen Dockercontainer ausgeführt.

Aktuell stellt er `GET /health` sowie die Konto- und Profilgrundlage bereit:

- `POST /auth/access` meldet einen vorhandenen Nutzer an oder registriert einen neuen Namen.
- `POST /auth/logout` beendet die aktuelle Sitzung.
- `GET /auth/me` und `GET /profile` liefern das angemeldete Profil.
- `POST /profile/avatar` akzeptiert ein serverseitig geprüftes JPEG, PNG oder WebP bis 5 MB.

Passwörter liegen nur als Argon2id-Hash vor. Eine Passwortwiederherstellung existiert bewusst nicht.

Lobbys und Partien werden ebenfalls ausschließlich serverseitig erstellt. Beim Start müssen zwei bis sechs Mitglieder bereit sein; der Server mischt, teilt elf Karten und sieben Münzen pro Spieler aus und liefert private Ansichten ohne fremde Handkarten.
