# Zielplattform und Verteilung

## Entscheidung

Escalera wird als installierbare Progressive Web App (PWA) mit einer einzigen gemeinsamen Codebasis umgesetzt.

Sie richtet sich ausschließlich an mobile Nutzer auf:

- iPhone und iPad mit iOS beziehungsweise iPadOS
- Smartphones und Tablets mit Android

Es werden weder zwei getrennte Apps noch eine separate iOS- und Android-Oberfläche entwickelt. Spielfunktionen, Regeln, Layoutlogik und Inhalte sind auf beiden Plattformen identisch.

## Warum eine PWA

Eine PWA passt am besten zu den Anforderungen:

- Installation direkt über einen HTTPS-Link
- keine Veröffentlichung im Apple App Store oder Google Play Store
- eine gemeinsame Frontend-Codebasis
- App-Symbol auf dem Home-Bildschirm
- Start als eigene App ohne Adress- oder Browser-Navigationsleiste
- zentrale Aktualisierung ohne erneuten Store-Download
- sehr gut geeignet für ein serverbasiertes Kartenspiel

Unity oder zwei native Apps würden Downloadgröße, Entwicklungsaufwand und Verteilung unnötig erhöhen, ohne für dieses Spiel einen fachlichen Vorteil zu bieten.

## Installation

1. Der Nutzer öffnet den offiziellen Escalera-Link.
2. Eine kurze Installationsseite erklärt das Hinzufügen zum Home-Bildschirm.
3. Nach der Installation startet Escalera über ein eigenes App-Symbol.
4. Das eigentliche Spiel soll nur im installierten App-Modus angeboten werden; im normalen Browser wird vorrangig die Installationsanleitung gezeigt.

Die genaue Systemaktion zum Hinzufügen auf den Home-Bildschirm unterscheidet sich zwangsläufig zwischen iOS und Android. Nach der Installation sind Spiel und Bedienung gleich.

## Vollbild

Das Web-App-Manifest fordert `fullscreen` an und verwendet `standalone` als Rückfallmodus. Im installierten Zustand dürfen keine Adressleiste und keine Browser-Navigationsleiste sichtbar sein.

Systemelemente, die das Betriebssystem aus Sicherheitsgründen erzwingt – beispielsweise Statusanzeige, Kameraaussparung oder Home-Indikator – werden über sichere Bildschirmränder berücksichtigt und können nicht auf jedem Gerät vollständig entfernt werden.

## Darstellung

- Mobile-first, Touch-Bedienung
- gleiche Informationsarchitektur auf iOS und Android
- Unterstützung von Hoch- und Querformat
- responsive Anpassung an Smartphone und Tablet
- Berücksichtigung von Notch, Dynamic Island und Android-Systemleisten
- keine Funktion darf ausschließlich durch Hover oder Rechtsklick erreichbar sein
- Spielkarten und Aktionen müssen mit Fingereingabe zuverlässig bedienbar sein

## Netzverbindung

Eine aktive Verbindung zum Server ist für Lobby und Partie erforderlich. Eine kurze Unterbrechung führt in den dokumentierten Wiedereintrittsablauf. Ein vollständiger Offline-Spielmodus ist nicht vorgesehen.

## Unterstützungsziel

Die Kernfunktionen werden auf aktuellen iOS-/iPadOS- und Android-Versionen getestet. Vor Veröffentlichung wird eine konkrete Mindestversions-Matrix anhand realer Testgeräte festgelegt.

## Offizielle Grundlagen

- [WebKit: Home-Screen-Web-Apps öffnen mit `standalone` oder `fullscreen` als eigene App](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Apple: Standalone-Web-Apps besitzen keine Browser-Werkzeugleiste](https://developer.apple.com/videos/play/wwdc2023/10120/)
- [MDN: Anzeigearten installierter Web-Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/display)

