# Nichtfunktionale Anforderungen

## Zweck

Dieses Dokument beschreibt Qualitätsziele für das Spiel. Die konkrete Zielplattform bleibt zunächst offen.

## Verständlichkeit

- **Entwurf:** Neue Spieler sollen ohne externe Anleitung eine Partie beginnen können.
- **Entwurf:** Fehlermeldungen sollen Ursache und mögliche Lösung nennen.

## Zuverlässigkeit

- **Entwurf:** Gültige Spielstände dürfen durch normale Bedienung nicht verloren gehen.
- **Entwurf:** Ungültige Spielzustände sollen verhindert werden.
- **Bestätigt:** Eine laufende Partie muss mindestens für die Lebensdauer ihrer Lobby erhalten bleiben.
- **Entwurf:** Kurzzeitige Verbindungsabbrüche sollen nicht unmittelbar zum Verlust der Partie führen.

## Geschwindigkeit

- Sichtbare Reaktion auf eine lokale Touch-Eingabe innerhalb von 100 ms.
- Serverseitige Verarbeitung eines normalen Spielbefehls im 95. Perzentil unter 150 ms, ohne Übertragungszeit.
- Bestätigung eines Spielbefehls unter normaler mobiler Verbindung üblicherweise innerhalb von 750 ms.
- Flüssige Kartenbewegungen mit Zielwert 60 Bildern pro Sekunde auf unterstützten Geräten.
- Nach kurzer Netzunterbrechung soll die Wiederverbindung üblicherweise innerhalb von 5 Sekunden beginnen.

## Verfügbarkeit und Aktualisierung

- Zielverfügbarkeit des Spielservers: mindestens 99,5 % pro Kalendermonat, geplante Wartung ausgenommen.
- Eine neue PWA-Version darf eine laufende Partie nicht ungefragt neu laden.
- Updates werden im Hintergrund vorbereitet und erst außerhalb einer aktiven Partie oder nach Zustimmung aktiviert.
- Der Service Worker speichert nur die App-Oberfläche zwischen; private Handkarten und authentifizierte API-Antworten werden nicht dauerhaft im Browsercache abgelegt.

## Plattformgleichheit und Vollbild

- Eine gemeinsame PWA-Codebasis für iOS und Android.
- Funktionsumfang und Spielregeln dürfen sich zwischen den Plattformen nicht unterscheiden.
- Nach Installation keine Browser-Adress- oder Navigationsleiste.
- Berücksichtigung betriebssystembedingter sicherer Bildschirmränder.
- Touch-Ziele müssen auf kleinen Smartphones zuverlässig bedienbar sein.

## Datenschutz

- Gespeichert werden Benutzername, sicherer Passwort-Hash, optionales Profilbild sowie Spielstatistiken.
- Detaillierte Daten abgelaufener Lobbys werden spätestens nach fünf Minuten gelöscht.
- Nur für Spiel, Konto und Statistik notwendige Daten werden gespeichert.

## Sicherheit

- Der Server ist alleinige Autorität für Spielzustand, Zufall, Timer und Wertung.
- Sämtliche Clientbefehle werden serverseitig authentifiziert und validiert.
- Passwörter werden mit Argon2id gehasht und nie im Klartext gespeichert.
- HTTPS/WSS ist verpflichtend.
- Anmeldung, Uploads und Echtzeitverbindung erhalten Ratenbegrenzung und Eingabeprüfung.

## Barrierefreiheit

- Farben müssen konsistent sein und zusammenpassen.
- Spielzustände dürfen nicht ausschließlich durch Farbe unterschieden werden.
- Für Farbenblinde problematische Farbkombinationen sind zu vermeiden.
- Schriftgrößen und Kartenwerte müssen gut lesbar sein.

## Wartbarkeit der Anforderungen

- Spielregeln und fachliche Begriffe sollen eindeutig dokumentiert sein.
- Änderungen an Regeln sollen in allen betroffenen Dokumenten nachvollziehbar aktualisiert werden.
