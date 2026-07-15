# Same-Origin-Betrieb

Der Client-Container ist der einzige öffentliche Einstiegspunkt. Er liefert die PWA aus und leitet zwei Pfade intern an den Server weiter:

- `/api/*` an die HTTP-API
- `/socket.io/*` an Socket.IO einschließlich WebSocket-Upgrade

Im lokalen Docker-Verbund ist die Anwendung unter `http://localhost:8080` erreichbar. Der Serverport wird nicht auf dem Host veröffentlicht.

Für den öffentlichen Betrieb muss vor dem Client-Container TLS terminiert werden, beispielsweise durch den Reverse Proxy des Hostinganbieters. `CLIENT_ORIGIN` wird dabei auf die vollständige öffentliche HTTPS-Origin gesetzt. Weitergeleitete Anfragen müssen `X-Forwarded-Proto: https` erhalten. Zertifikate und private Schlüssel werden nicht in das Repository oder Image aufgenommen.

Produktionsbeispiel:

```text
CLIENT_ORIGIN=https://escalera.example
```

Die API setzt keine cachebaren privaten Antworten voraus. Nginx markiert `/api/*` ausdrücklich mit `Cache-Control: no-store`; der Service Worker schließt denselben Pfad aus.
