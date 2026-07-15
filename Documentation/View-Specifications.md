# Verbindliche View-Spezifikationen

## Login und Registrierung – Hochformat

- Onyx als kompletter Hintergrund
- zentrale Onyx-Card mit weißem, 1 bis 3 Pixel starkem Rahmen
- fast eckiger Radius
- ungefähr 90 % der Viewbreite
- bevorzugt ungefähr 55 %, maximal 70 % der Viewhöhe
- Headerfolge: Pik, Herz, „Escalera“, Kreuz, Karo
- Label und Textfeld für Benutzername
- Label und Textfeld für Passwort
- gemeinsamer Button für Anmeldung oder automatische Registrierung
- zurückhaltender Hinweistext: Ist der Name frei, wird er mit dem eingegebenen Passwort registriert. Der Name gehört dem Nutzer nur, solange er das Passwort kennt; eine Wiederherstellung ist nicht möglich.

## Lobbyliste – Hochformat

### Header

- Logout links
- „Escalera“ zentriert
- Profil-Icon rechts
- Online-Status direkt beim Profil

### Inhalt

- Begrüßung mit Benutzername
- Suchfeld mit Icon-Suchbutton
- Button zum Erstellen einer Lobby
- Erstellen-Formular als modale Border-Card mit Spielerlimit, Jokeranzahl und Zugzeit
- Lobbylisten-Card mit internem Scrollbereich
- mindestens drei Lobby-Cards sind gleichzeitig sichtbar
- die Lobbyliste überschreitet die Viewhöhe niemals
- jede Lobby-Card zeigt mindestens Name/Code, Spielerzahl, Status und Beitreten-Aktion

## Lobby – Hochformat

- Einstellungen werden als abgerundete Border-Labels dargestellt
- Host darf Einstellungen ändern; andere Spieler sehen sie nur
- alle Mitglieder werden als Cards dargestellt
- Bereitschaft wird durch Farbe plus Text oder Symbol vermittelt
- Hauptaktionen: „Bereit“ und „Verlassen“
- verlässt der Host, wird der früheste noch anwesende Spieler neuer Host
- Host erhält zusätzliche Einstellungsaktionen
- sobald mindestens zwei Spieler anwesend und alle bereit sind, startet die Partie automatisch
- alle Pflichtinformationen und Aktionen bleiben ohne Seiten-Scrollen erreichbar

## Spieltisch – Querformat

### Gegner und Navigation

- Gegner stehen oben in Zugreihenfolge
- sichtbar sind Handkartenanzahl, Münzen und Punkte
- der aktive Spieler steht rechts und wird deutlich größer dargestellt
- Navbar-Button oben links öffnet Scoreboard, Handsortierung, eigene Statistiken und Spielerprofile
- „Lobby verlassen“ steht ganz unten in der Navbar

### Spielfeld

- Nachziehstapel links
- Ablagestapel rechts
- Meld-Zone dazwischen
- ungefähr zwei Melds pro Reihe
- Meld-Zone ist intern scrollbar, weil nicht alle Melds gleichzeitig sinnvoll darstellbar sind

### Eigene Hand

- ungefähr 90 % der Viewbreite
- leichte Fächerung beziehungsweise leichter Schwung
- ungefähr 30 % der Karten ragen unten aus dem Viewport
- die oberen ungefähr 70 % bleiben sichtbar und bedienbar
- Auswahl, Sortierung und Kartenwerte bleiben trotz Überlappung eindeutig
