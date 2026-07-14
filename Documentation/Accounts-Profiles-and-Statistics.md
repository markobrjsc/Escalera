# Konten, Profile, Statistiken und Erfolge

## Kontoerstellung und Anmeldung

Es gibt eine gemeinsame Eingabemaske mit Benutzername und Passwort:

1. Der Server normalisiert den Benutzernamen und prüft ihn ohne Beachtung der Groß-/Kleinschreibung auf Eindeutigkeit.
2. Ist der Name noch nicht vergeben, wird ein neues Konto mit dem angegebenen Passwort angelegt.
3. Ist der Name bereits vergeben, wird das Passwort geprüft und der Nutzer bei Erfolg angemeldet.
4. Bei falschem Passwort wird keine Anmeldung durchgeführt.

Der Benutzername ist der sichtbare Profilname. Verwechslungen durch reine Groß-/Kleinschreibung oder führende beziehungsweise nachfolgende Leerzeichen sind nicht erlaubt.

Vor einer automatischen Neuanlage zeigt der Client eine eindeutige Bestätigung und verlangt die Wiederholung des Passworts. Dadurch erzeugt ein Tippfehler im Benutzernamen nicht unbemerkt ein neues Konto.

## Passwortsicherheit

- Passwörter werden niemals im Klartext gespeichert oder protokolliert.
- Speicherung als gesalzener Argon2id-Hash.
- Mindestlänge 12 Zeichen; Passphrasen und alle üblichen Zeichen sind erlaubt.
- Anmeldeversuche werden begrenzt, um automatisiertes Erraten zu erschweren.
- Fehlermeldungen geben keine technischen Kontodetails preis.
- Sitzungen werden über sichere, nicht durch JavaScript lesbare Cookies verwaltet.
- Sämtliche Anmeldung und Spielkommunikation erfolgt ausschließlich verschlüsselt über HTTPS/WSS.

## Passwortverlust

Da weder E-Mail-Adresse noch Telefonnummer erhoben werden, gibt es keine automatische Passwortwiederherstellung. Der Spieler ist selbst dafür verantwortlich, sein Passwort sicher aufzubewahren. Geht es verloren, kann das Konto nicht wiederhergestellt werden. Dieser Hinweis muss vor der Registrierung deutlich angezeigt und bestätigt werden.

Sicherheitsfragen oder manuelle Herausgabe eines neuen Passworts durch Administratoren sind nicht vorgesehen.

## Profil

Ein Profil enthält:

- eindeutige interne Kennung
- eindeutigen Benutzernamen
- Passwort-Hash
- optionales Profilbild
- Zeitpunkt der Erstellung
- Tutorialstatus
- Statistik- und Erfolgsfortschritt

## Profilbild

- optionaler Upload
- erlaubte Formate: JPEG, PNG und WebP
- maximale Uploadgröße: 5 MB
- serverseitige Prüfung des tatsächlichen Dateityps
- Entfernen von Metadaten und serverseitige Umwandlung in festgelegte Bildgrößen
- zufälliger interner Dateiname statt Verwendung des ursprünglichen Namens
- Möglichkeit zum Ersetzen und Löschen

## Tutorial

Nach der ersten Registrierung wird ein kurzes, überspringbares Tutorial angeboten. Es kann später über Einstellungen oder Hilfe erneut gestartet werden. Der Abschluss- beziehungsweise Überspringstatus wird im Profil gespeichert.

## Statistiken

Mindestens folgende Werte werden dauerhaft geführt:

- gespielte, gewonnene und beendete Partien
- Siege und Siegquote
- Platzierungen
- Gesamt- und durchschnittliche Strafpunkte
- niedrigste und höchste Endpunktzahl
- gespielte und erfolgreich beendete Phasen
- ausgelegte Gruppen und Straßen
- ausgelegte Escaleras und deren Längen
- verwendete Joker
- gekaufte Karten und ausgegebene Münzen
- gewonnene konkurrierende Kartenkäufe
- Anzahl Zeitüberschreitungen
- Anzahl Wiedereintritte
- längste Siegesserie

Statistiken werden ausschließlich aus vom Server bestätigten Ereignissen erzeugt. Der Client darf keine Statistikwerte direkt setzen.

## Erfolge und Erfolgsbaum

Erfolge werden aus denselben bestätigten Statistikereignissen abgeleitet. Ein Erfolg besitzt:

- Kennung, Name und Beschreibung
- Symbol
- Kategorie
- ein- oder mehrstufiges Ziel
- sichtbaren Fortschritt
- optionale Voraussetzung auf einen vorherigen Erfolg
- Zeitpunkt der Freischaltung

Mögliche Kategorien sind Spiele, Siege, Phasen, Straßen, Gruppen, Joker, Kartenkäufe und Serien. Die genaue Liste der Erfolge wird erst nach Fertigstellung des Kernspiels ausgearbeitet.

## Datenschutz und Löschung

- Es werden keine E-Mail-Adresse und keine Telefonnummer benötigt.
- Detaillierte Lobby- und Spielzustände werden spätestens fünf Minuten nach Ablauf gelöscht.
- Dauerhafte Statistiken enthalten zusammengefasste Ergebnisse, keine wiederherstellbaren Handkartenverläufe.
- Das Löschen eines Kontos entfernt Profil, Bild, Sitzungen und persönliche Statistiken.

## Sicherheitsgrundlagen

- [OWASP: Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP: Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
