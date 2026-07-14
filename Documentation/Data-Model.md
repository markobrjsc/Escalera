# Fachliches Datenmodell

## Lobby

- Kennung
- Gastgeber
- Teilnehmer
- Bereitschaftsstatus je Spieler
- Status der Lobby
- Zeitpunkt des letzten verbundenen Teilnehmers beziehungsweise Ablaufzeitpunkt der zweiminütigen Frist
- Spieleinstellungen
- zugehörige laufende Partie
- Ablaufzeitpunkt für endgültige Löschung, spätestens fünf Minuten nach Ende

## Spieleinstellungen

- Spielergrenze: 2 bis 6
- Anzahl zusätzlicher Joker
- maximale Zugzeit
- Farbregel für zusätzliche Straßen
- Zugabschluss-Bestätigung

## Partie

- Spieler und Zugreihenfolge
- Startspieler und aktiver Spieler
- gemeinsame aktuelle Phase
- aktueller Zugzustand und verbleibende Zeit
- Nachziehstapel
- Ablagestapel
- ausgelegte Kombinationen
- Rundenergebnisse und Gesamtpunktzahlen
- Partiestatus

## Spieler

- Kennung und Anzeigename
- Handkarten
- sieben Münzen zu Spielbeginn
- Bereitschafts- und Verbindungsstatus
- Zeitpunkt des Verbindungsabbruchs und mögliche Wiedereintrittsfrist
- bereits ausgelegte Phasenkombination
- Erfolg in der gemeinsamen Phase der laufenden Runde
- Rundenspunkte und Gesamtpunkte
- optionale Profil- und Statistikdaten

## Benutzerkonto

- interne Kennung
- normalisierter eindeutiger Benutzername
- sichtbarer Benutzername
- Argon2id-Passwort-Hash
- optionaler Verweis auf ein verarbeitetes Profilbild
- Tutorialstatus
- Erstellungs- und Änderungszeitpunkte

## Statistik und Erfolg

- verdichtete Zähler und Bestwerte je Benutzer
- vom Server bestätigte Statistikereignisse
- freigeschaltete Erfolge und Freischaltzeitpunkt
- Fortschritt mehrstufiger Erfolge

## Karte

- Kartenwert: 2 bis 10, Bube, Dame, König, Ass oder Joker
- Farbe: Kreuz, Pik, Herz oder Karo; bei Joker ohne feste Farbe
- Herkunft aus Kartensatz 1 oder 2 zur eindeutigen Unterscheidung doppelter Karten

## Kombination

- Art: gleiche Kartenwerte oder Straße
- enthaltene Karten
- Besitzer beziehungsweise auslegender Spieler
- Phase oder zusätzliche Kombination
- verwendeter Joker

## Spielaktion

- laufende Nummer
- Spieler
- Aktionsart
- betroffene Karten oder Kombination
- Zeitpunkt
- Ergebnis

Für konkurrierende Kaufanfragen muss die serverseitige Verarbeitungsreihenfolge eindeutig sein. Eine Karte kann nur einer gültigen Kaufaktion zugeordnet werden.

Ein kurzer Aktionsverlauf kann für Synchronisation, Wiederherstellung und Nachvollziehbarkeit genutzt werden, auch wenn keine vollständige Historienansicht vorgesehen ist.

## Lebensdauer

Eine Partie muss mindestens so lange erhalten bleiben, wie ihre Lobby besteht. Spätestens fünf Minuten nach Ende oder Ablauf werden Lobby, Hände und detaillierter Spielzustand gelöscht. Dauerhafte Profile, verdichtete Statistiken und Erfolge bleiben davon getrennt erhalten.
