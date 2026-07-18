# Escalera Audio Design

## Ursprung und Lizenz

Alle Musik- und Soundeffekte werden zur Laufzeit durch `client/src/audio.tsx` mit der Web Audio API synthetisiert. Es werden keine externen Samples, Musikdateien oder fremden Audio-Assets ausgeliefert. Damit bestehen weder Attributionserfordernisse noch ungeklärte Drittanbieter-Lizenzen.

## Klangfamilien

- **UI:** kurze, helle Transienten für Buttons und Icons; weichere Sweeps für Dialoge und Szenenwechsel.
- **Feedback:** aufsteigende Intervalle für Erfolg, tiefe absteigende Intervalle für Fehler und Timeout.
- **Karten:** gefiltertes Rauschen für Papierbewegung, kurze tonale Körper für Aufnehmen, Ablegen, Flip und Merge.
- **Spiel:** zurückhaltende Stings für Zug, Rundenende, Sieg und Niederlage.
- **Musik:** prozedurale Akkordflächen und dezente Pulse für Menü, Lobby, Gamefield und Ergebnisansicht.

## Mix-Regeln

- Die Musik startet erst nach der ersten zulässigen Nutzerinteraktion und wird zwischen Szenen überblendet.
- Wichtige Ereignisse ducken die Musik kurz, ohne sie hart zu stoppen.
- Ein Limiter schützt den Master-Ausgang vor Clipping.
- Realtime-Aktionen werden anhand ihrer `commandId` dedupliziert.
- Wiederholungsgrenzen verhindern Klangsalven bei schnellem Klicken oder Deal-Animationen.
- Bei ausgeblendetem Tab wird der AudioContext pausiert.

## Profileinstellungen

Master, Musik, UI und Spiel-SFX werden als Prozentwerte von 0 bis 100 gespeichert. Der Mute-Schalter setzt den Master-Ausgang vollständig auf null, ohne die vier zuvor gewählten Pegel zu verändern.
