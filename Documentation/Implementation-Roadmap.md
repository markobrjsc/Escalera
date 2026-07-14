# Umsetzungs-Roadmap

## Zweck

Diese Roadmap beschreibt die fachliche Reihenfolge der späteren Arbeit. Sie legt noch keine Zielplattform oder Technologie fest.

## Phase 1 – Anforderungen klären

- Spielziel und vollständige Regeln festlegen
- Begriffe vereinheitlichen
- Sonderfälle und Varianten bestimmen
- Muss-, Soll- und Kann-Funktionen priorisieren

## Phase 2 – Spielerlebnis beschreiben

- wichtigste Benutzerabläufe festlegen
- benötigte Ansichten bestimmen
- Bedienung und Hilfestellungen definieren
- Anforderungen an Barrierefreiheit festlegen

## Phase 3 – Fachliches Modell absichern

- Spielzustände und Zustandswechsel definieren
- Datenobjekte und Beziehungen konkretisieren
- Wertungen und Gewinnermittlung anhand von Beispielen prüfen
- Akzeptanzkriterien für Kernfunktionen formulieren

## Phase 4 – Technische Richtung absichern

- PWA-Grundgerüst auf iOS und Android als Installationsprototyp testen
- Vollbild-/Standalone-Verhalten auf realen Geräten prüfen
- Client-Server-Verträge und Datenbankschema festlegen
- Hosting und Domain auswählen

## Phase 5 – Erste spielbare Version planen

- Umfang der ersten Version festlegen
- Arbeitspakete bilden
- Tests aus Regeln und Akzeptanzkriterien ableiten
- Implementierung beginnen

## Definition „bereit für die Implementierung“

Die Implementierung beginnt, wenn mindestens folgende Punkte bestätigt sind:

- vollständiger Standard-Spielablauf
- Punkte- und Gewinnregeln
- Spielerzahl und Spielvarianten der ersten Version
- Muss-Funktionen
- wichtigste Ansichten und Benutzerabläufe
- fachliches Datenmodell
- Zielplattform

## Festgelegte technische Richtung

- installierbare mobile PWA
- eine React-/TypeScript-Codebasis für iOS und Android
- autoritatives NestJS-Backend mit Socket.IO
- PostgreSQL für dauerhafte Daten und Redis für kurzlebige Lobbyzustände
- Verteilung per HTTPS-Link ohne App Stores
