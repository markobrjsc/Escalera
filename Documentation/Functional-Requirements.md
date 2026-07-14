# Funktionale Anforderungen

## Muss – erste spielbare Version

### Installation und Konto

- als PWA über einen HTTPS-Link installierbar sein
- im installierten Zustand ohne Browser-Adress- und Navigationsleisten starten
- auf iOS und Android dieselben Spielfunktionen anbieten
- Benutzer anhand von Name und Passwort registrieren oder anmelden
- optionales Profilbild hochladen, ersetzen und löschen
- nach der ersten Registrierung ein überspringbares Tutorial anbieten

### Lobby

- Lobby für 2 bis 6 Spieler erstellen und betreten
- Spielernamen und Bereitschaftsstatus anzeigen
- Partie erst starten, wenn alle Spieler bereit sind
- Anzahl zusätzlicher Joker konfigurieren
- maximale Zeit pro Zug konfigurieren
- Farbregel für zusätzlich ausgelegte Straßen konfigurieren
- Bestätigung beim Ablegen der letzten Karte beziehungsweise Beenden des Zuges ein- oder ausschalten

### Partie

- zwei Kartensätze und die konfigurierte Jokeranzahl mischen
- jedem Spieler elf Karten und sieben Münzen geben
- Nachzieh- und Ablagestapel verwalten
- aktiven Spieler und Zugreihenfolge verwalten
- Karte ziehen, Kombinationen auslegen, Karten anlegen und eine Karte abwerfen
- Kartenkauf durch Spieler ermöglichen, die gerade nicht am Zug sind
- gemeinsamen Phasenfortschritt führen
- nach erfolgreichem Phasenende alle Spieler gemeinsam genau eine Phase erhöhen
- höchstens einen Joker je Kombination erlauben
- ungültige Aktionen verhindern und verständlich erklären
- Zugzeit anzeigen und Spieler bei Zeitablauf überspringen
- bei Zeitablauf nötigenfalls automatisch ziehen und eine zufällige Handkarte abwerfen
- getrennte Spieler überspringen und innerhalb der zweiminütigen Lobby-Frist wieder aufnehmen
- konkurrierende Kartenkäufe nach der zuerst im Backend gültig verarbeiteten Anfrage entscheiden
- Rundenende erkennen und Handkartenpunkte berechnen
- Gesamtpunktzahl führen und nach der ersten erfolgreichen Phase 7 den Gewinner anzeigen
- Partie nach der ersten erfolgreichen Erfüllung von Phase 7 beenden
- geteilte Platzierungen bei Punktegleichstand anzeigen
- leeren Nachziehstapel automatisch aus dem neu gemischten Ablagestapel erneuern
- Lobby nach zwei Minuten ohne ausreichende verbundene Teilnehmer löschen

### Darstellung

- eigene Handkarten vollständig anzeigen
- ausgelegte Kombinationen aller Spieler anzeigen
- oberste Karte des Ablagestapels anzeigen
- Nachziehstapel, aktiven Spieler, gemeinsame Phase, Münzen, Zugzeit und Punktestand anzeigen
- verborgene Handkarten anderer Spieler nicht offenlegen

## Soll

- Profile und dauerhafte Statistiken gemäß eigenem Fachkonzept
- mehrstufige Erfolge und Erfolgsbaum aus bestätigten Statistikereignissen
- intuitiv verständliche Bedienung ohne Pflichtanleitung
- robuste Wiederherstellung einer laufenden Partie, solange die Lobby besteht
- kurze Anzeige der zuletzt erfolgten Spielaktionen

## Kann

- vollständige Zug- oder Spielhistorie, falls der geringe Zusatzaufwand einen klaren Nutzen bringt

## Serververbindlichkeit

- Jeder Spielbefehl wird an das Backend gesendet.
- Das Backend prüft Berechtigung, Zugstatus und Spielregel.
- Nur das Backend verändert den verbindlichen Spielzustand.
- Bestätigte Änderungen werden an alle berechtigten Clients verteilt.
- Jeder Client erhält nur öffentliche Daten und die eigenen privaten Karten.
- Beendete oder abgelaufene Lobbys werden spätestens nach fünf Minuten gelöscht.

## Ausgeschlossen

- Einzelspielermodus
- Rückgängig- oder Korrekturfunktion für abgeschlossene Aktionen
