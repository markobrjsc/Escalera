export type TutorialCategory = "Einstieg" | "Lobby" | "Profil & Audio" | "Spielzug" | "Regeln" | "Auswertung";

export type TutorialChapter = {
  id: string;
  category: TutorialCategory;
  title: string;
  summary: string;
  details: readonly string[];
  tip?: string;
  target?: string;
  targetLabel?: string;
  keywords: readonly string[];
  phases?: readonly { phase: number; requirement: string }[];
};

export const TUTORIAL_CHAPTERS: readonly TutorialChapter[] = [
  {
    id: "konto",
    category: "Einstieg",
    title: "Konto, Anmeldung & Orientierung",
    summary: "Ein Benutzername führt dich je nach Verfügbarkeit zur Anmeldung oder zur bewussten Kontoerstellung.",
    details: [
      "Neue Konten brauchen ein Passwort mit mindestens zwölf Zeichen und eine Wiederholung. Ohne das Passwort kann das Konto nicht wiederhergestellt werden.",
      "Escalera führt dich im Hochformat durch Anmeldung und Lobby, der Spieltisch wechselt ins Querformat.",
      "Über das Profilbild oben rechts öffnest du dein Profil; über das Symbol links meldest du dich ab oder verlässt die aktuelle Lobby."
    ],
    tip: "Installiere Escalera auf dem Home-Bildschirm, damit sichere Bildschirmränder und Ausrichtung wie in einer App funktionieren.",
    target: "profile-entry",
    targetLabel: "Profilzugang",
    keywords: ["registrieren", "login", "passwort", "abmelden", "home bildschirm", "ausrichtung"]
  },
  {
    id: "lobbyliste",
    category: "Lobby",
    title: "Lobby finden, beitreten oder erstellen",
    summary: "Die Lobbyliste ist dein Ausgangspunkt für jede Partie.",
    details: [
      "Suche nach Lobbyname, Code oder Gastgeber und öffne eine freie Lobby über Beitreten.",
      "Mit dem Plus erstellst du eine neue Lobby. Ein Konto kann immer nur in einer Lobby gleichzeitig sein.",
      "Offene Lobbys werden automatisch aktualisiert; der Verbindungsstatus zeigt, ob Echtzeit-Updates ankommen."
    ],
    target: "lobby-tools",
    targetLabel: "Lobby-Suche und Erstellen",
    keywords: ["suchen", "code", "beitreten", "erstellen", "plus", "online"]
  },
  {
    id: "lobby-einstellungen",
    category: "Lobby",
    title: "Lobby-Einstellungen",
    summary: "Der Gastgeber legt vor dem Start die Rahmenbedingungen der Partie fest.",
    details: [
      "Wähle zwei bis sechs Spieler, die Jokerzahl pro Spieler und die maximale Zugzeit.",
      "Die Straßenregel bestimmt, ob zusätzlich ausgelegte Straßen dasselbe Zeichen haben müssen oder farbunabhängig sein dürfen.",
      "Mit „Ablegen bestätigen“ wird ein regelkonformer Zugabschluss vor dem endgültigen Abwurf abgesichert. Einstellungen lassen sich nur vor dem Start ändern."
    ],
    target: "lobby-settings",
    targetLabel: "Lobby-Einstellungen",
    keywords: ["gastgeber", "spielerzahl", "jokerzahl", "zugzeit", "straße", "zeichen", "bestätigen"]
  },
  {
    id: "lobby-start",
    category: "Lobby",
    title: "Bereit, Mitspieler & Partiestart",
    summary: "Sobald mindestens zwei Personen und anschließend alle bereit sind, beginnt die Partie.",
    details: [
      "Die Spielerliste zeigt Gastgeber, Online-Status und Bereitschaft. Tippe auf ein Profilbild für Spieleraktionen.",
      "Als Gastgeber kannst du andere Spieler vor dem Start entfernen. Jeder Spieler schaltet den eigenen Bereit-Status selbst um.",
      "Beim Start mischt Escalera automatisch zwei Kartensätze, teilt elf Karten aus und vergibt sieben Münzen."
    ],
    target: "lobby-ready",
    targetLabel: "Bereit-Schaltfläche",
    keywords: ["bereit", "spieler", "host", "kick", "start", "elf karten", "sieben münzen"]
  },
  {
    id: "profil",
    category: "Profil & Audio",
    title: "Profilbild, Statistiken & Achievements",
    summary: "Dein Profil bündelt Identität, Fortschritt und die erneut aufrufbare Anleitung.",
    details: [
      "Lade ein JPEG-, PNG- oder WebP-Profilbild bis 5 MB hoch, ersetze es oder entferne es wieder.",
      "Die Statistikübersicht zeigt Partien, Siege, Strafpunkte und Käufe. Im Erfolgsbaum siehst du gesperrte, laufende und freigeschaltete Achievements.",
      "Über „Anleitung“ startest du dieses Tutorial jederzeit erneut; dein zuletzt gespeicherter Stand bleibt erhalten."
    ],
    target: "profile-entry",
    targetLabel: "Profil öffnen",
    keywords: ["avatar", "profilbild", "upload", "statistik", "erfolg", "achievement", "anleitung"]
  },
  {
    id: "audio-voice",
    category: "Profil & Audio",
    title: "Musik, SFX & Voice-Chat",
    summary: "Spielklang und Sprachchat lassen sich getrennt und lokal kontrollieren.",
    details: [
      "Im eigenen Profil stellst du Musik und SFX getrennt ein oder schaltest den gesamten Spielton stumm.",
      "Der Mikrofonknopf schaltet nur dein eigenes Mikrofon an oder aus. Der Verbindungsstatus zeigt, ob Voice verfügbar ist.",
      "Tippe auf das Profilbild eines anderen Spielers, um dessen Lautstärke nur für dich zu ändern oder die Person lokal stummzuschalten."
    ],
    tip: "Lokales Stummschalten verändert den Ton nur auf deinem Gerät und nicht für andere Teilnehmer.",
    target: "voice-controls",
    targetLabel: "Mikrofonsteuerung",
    keywords: ["musik", "sfx", "sound", "mikro", "self mute", "lautstärke", "lokal muten", "voice"]
  },
  {
    id: "spieltisch",
    category: "Spielzug",
    title: "Den Spieltisch lesen",
    summary: "Alle Informationen für deinen nächsten Schritt liegen im Querformat rund um den Tisch.",
    details: [
      "Oben stehen Zugreihenfolge, aktiver Spieler, Karten, Münzen, Strafpunkte, aktuelle Runde und Phasenanforderung.",
      "In der Mitte liegen Ziehstapel, Meld-Zone und offene Ablage; unten befindet sich deine sortier- und auswählbare Hand.",
      "Das Spielmenü öffnet Scoreboard, Profil, Anleitung und den abgesicherten Weg zum Verlassen der Partie."
    ],
    target: "game-board",
    targetLabel: "Spieltisch",
    keywords: ["hud", "tisch", "ziehstapel", "ablage", "meld zone", "hand", "scoreboard", "menü"]
  },
  {
    id: "zugablauf",
    category: "Spielzug",
    title: "Der regelkonforme Zug",
    summary: "Jeder eigene Zug folgt derselben Reihenfolge: ziehen, optional spielen, genau eine Karte abwerfen.",
    details: [
      "Ziehe zuerst genau eine Karte vom Nachziehstapel oder von der offenen Ablage.",
      "Danach darfst du deine Phase vollständig auslegen, weitere Melds spielen oder passende Karten an bestehende Melds anlegen.",
      "Wähle zum Abschluss genau eine Handkarte und lege sie offen ab. Erst der bestätigte Abwurf beendet deinen Zug."
    ],
    tip: "Die laufende Hinweismeldung über dem Tisch nennt immer die gerade erlaubte Aktion.",
    target: "player-hand",
    targetLabel: "Eigene Handkarten",
    keywords: ["zug", "ziehen", "auslegen", "anlegen", "abwerfen", "zugende", "reihenfolge"]
  },
  {
    id: "ziehen-abwerfen",
    category: "Spielzug",
    title: "Ziehen, auswählen & abwerfen",
    summary: "Karten reagieren auf Tippen, Tastatur und Ziehbewegungen; der Server bestätigt jede gültige Aktion.",
    details: [
      "Tippe auf Ziehstapel oder Ablage, wenn du am Zug bist und noch nicht gezogen hast.",
      "Tippe Handkarten an, um sie auszuwählen, oder ziehe sie auf eine hervorgehobene Zielzone. Abgelehnte Ziele werden nicht ausgeführt.",
      "Zum Abwerfen darf genau eine Karte ausgewählt sein. Ist der Nachziehstapel leer, wird die Ablage automatisch neu gemischt."
    ],
    target: "draw-discard",
    targetLabel: "Zieh- und Ablagestapel",
    keywords: ["draw", "drag", "touch", "tastatur", "auswählen", "abwurf", "leerer stapel"]
  },
  {
    id: "kaufen",
    category: "Spielzug",
    title: "Ablage kaufen & Münzen planen",
    summary: "Nicht aktive Spieler dürfen die gerade angebotene Ablagekarte für eine Münze kaufen.",
    details: [
      "Der Kaufen-Knopf erscheint nur, solange die Karte verfügbar ist. Bei Konkurrenz erhält die erste gültig verarbeitete Anfrage die Karte.",
      "Der Kauf kostet eine Münze und nimmt nur die Ablagekarte auf deine Hand. In deinem nächsten regulären Zug musst du trotzdem ziehen.",
      "Du startest die gesamte Partie mit sieben Münzen; sie werden zwischen den Runden nicht aufgefüllt. Jede übrige Münze kompensiert am Spielende 30 Strafpunkte, niemals unter null."
    ],
    target: "buy-discard",
    targetLabel: "Kaufen-Schaltfläche",
    keywords: ["kaufen", "münze", "angebot", "konkurrenz", "budget", "kompensation", "30"]
  },
  {
    id: "gruppen-melds",
    category: "Regeln",
    title: "Gruppen auslegen & weitere Melds",
    summary: "Eine Gruppe besteht aus mindestens drei Karten desselben Werts; das Zeichen spielt keine Rolle.",
    details: [
      "Deine erste Auslage einer Runde muss die aktuelle Phasenanforderung vollständig in einem Vorgang erfüllen.",
      "Stärkere Kombinationen sind erlaubt, etwa vier gleiche Werte statt der geforderten drei.",
      "Nach deiner Phase darfst du sofort oder später weitere Gruppen und Straßen auslegen sowie einzelne passende Karten an beliebige bestehende Melds anlegen."
    ],
    target: "meld-zone",
    targetLabel: "Meld-Zone",
    keywords: ["gruppe", "meld", "gleiche werte", "phase auslegen", "stärker", "kombination"]
  },
  {
    id: "phasen",
    category: "Regeln",
    title: "Alle sieben gemeinsamen Phasen",
    summary: "Alle Spieler bearbeiten dieselbe Phase und wechseln nach einem erfolgreichen Rundenende gemeinsam weiter.",
    details: [
      "Niemand bleibt individuell in einer alten Phase zurück. Eine Runde endet, sobald ein Spieler seine Hand leert.",
      "Die geforderte Kombination ist eine Mindestanforderung und muss beim ersten Auslegen vollständig sein.",
      "Phase 7 ist die Escalera: sieben aufeinanderfolgende Karten desselben Zeichens."
    ],
    phases: [
      { phase: 1, requirement: "1× 3 gleiche Kartenwerte" },
      { phase: 2, requirement: "2× 3 gleiche Kartenwerte" },
      { phase: 3, requirement: "1× 4 gleiche Kartenwerte" },
      { phase: 4, requirement: "2× 4 gleiche Kartenwerte" },
      { phase: 5, requirement: "1× 5 gleiche Kartenwerte" },
      { phase: 6, requirement: "2× 5 gleiche Kartenwerte" },
      { phase: 7, requirement: "7er-Straße mit demselben Zeichen" }
    ],
    target: "phase-status",
    targetLabel: "Phasenanzeige",
    keywords: ["phase 1", "phase 2", "phase 3", "phase 4", "phase 5", "phase 6", "phase 7", "escalera"]
  },
  {
    id: "strassen-joker",
    category: "Regeln",
    title: "Straßen, Joker & Anlegen",
    summary: "Straßen sind Folgen ohne wiederholten Kartenwert; Joker schließen genau eine Lücke.",
    details: [
      "Das Ass darf unter der 2 oder über dem König liegen. Nach dem Ass darf die Folge bei 2 weitergehen, aber kein Wert darf sich wiederholen.",
      "Eine Straße umfasst höchstens 13 Werte. Für Phase 7 ist dasselbe Zeichen Pflicht; für spätere zusätzliche Straßen gilt die Lobby-Einstellung.",
      "Pro Kombination ist höchstens ein Joker erlaubt. Ein ausgelegter Joker bleibt liegen und kann nicht ausgetauscht oder erneut verwendet werden."
    ],
    target: "meld-zone",
    targetLabel: "Ausgelegte Melds",
    keywords: ["straße", "ass", "könig", "kreis", "zeichen", "joker", "anlegen", "13"]
  },
  {
    id: "feedback-verbindung",
    category: "Spielzug",
    title: "Meldungen, Fehler, Zugzeit & Reconnect",
    summary: "Direktes Feedback schützt den gültigen Spielzustand und erklärt, was als Nächstes möglich ist.",
    details: [
      "Ungültige Kombinationen, falsche Ziele oder veraltete Aktionen werden abgewiesen und als verständliche Meldung angezeigt.",
      "Läuft die Zugzeit ab, zieht Escalera falls nötig automatisch, verwirft unbestätigte Bewegungen und wirft eine zufällige Handkarte ab.",
      "Bei Verbindungsabbruch werden deine Züge übersprungen. Du bleibst in der Partie und kannst innerhalb von zwei Minuten in dieselbe Lobby zurückkehren."
    ],
    target: "turn-feedback",
    targetLabel: "Zughinweis und Status",
    keywords: ["meldung", "validierung", "fehler", "timeout", "zugzeit", "offline", "reconnect", "zwei minuten"]
  },
  {
    id: "rundenende",
    category: "Auswertung",
    title: "Rundenende & Strafpunkte",
    summary: "Wer zuerst alle Handkarten ablegt, beendet die Runde; alle Restkarten werden anschließend gewertet.",
    details: [
      "Karten von 2 bis 7 zählen je 5 Punkte, 8 bis König je 10, Asse 15 und Joker 30 Punkte.",
      "Nur Karten, die beim Rundenende noch auf deiner Hand liegen, werden zur Gesamtstrafe addiert.",
      "Die Rundenansicht zeigt die neuen Werte; im Scoreboard kannst du jede Runde und den aktuellen Gesamtstand nachlesen."
    ],
    target: "scoreboard-entry",
    targetLabel: "Scoreboard",
    keywords: ["rundenende", "strafpunkte", "punkte", "joker 30", "ass 15", "scoreboard", "restkarten"]
  },
  {
    id: "spielende",
    category: "Auswertung",
    title: "Spielende, Platzierung & sicher verlassen",
    summary: "Nach der vollständig gewerteten Phase 7 gewinnt die niedrigste kompensierte Gesamtpunktzahl.",
    details: [
      "Nach der letzten Rundenwertung werden je verbliebener Münze 30 Strafpunkte abgezogen; das Ergebnis kann nicht negativ werden.",
      "Die Abschlussansicht zeigt Rangfolge, kompensierte Punkte und Gleichstände. Gleiche Punktzahlen teilen sich denselben Platz.",
      "Eine laufende Partie verlässt du über das Menü und eine Sicherheitsabfrage. Nach dem Ende führt die Ergebnisansicht zurück zur Lobbyliste."
    ],
    tip: "Du kannst jedes Kapitel später als Regelreferenz über Profil oder Spielmenü wieder öffnen.",
    target: "game-menu-entry",
    targetLabel: "Spielmenü",
    keywords: ["spielende", "gewinner", "niedrigste punkte", "gleichstand", "münzen", "verlassen", "ergebnis"]
  }
];

export const TUTORIAL_CHAPTER_COUNT = TUTORIAL_CHAPTERS.length;
export const ALL_TUTORIAL_CHAPTERS_MASK = (2 ** TUTORIAL_CHAPTER_COUNT) - 1;

export function chapterBit(index: number) {
  return 2 ** index;
}

export function isChapterRead(readMask: number, index: number) {
  return (readMask & chapterBit(index)) !== 0;
}

export function readChapterCount(readMask: number) {
  return TUTORIAL_CHAPTERS.reduce((count, _chapter, index) => count + (isChapterRead(readMask, index) ? 1 : 0), 0);
}

export function clampTutorialStep(step: number | undefined) {
  return Math.min(Math.max(Number.isInteger(step) ? step! : 0, 0), TUTORIAL_CHAPTER_COUNT - 1);
}

function searchableText(chapter: TutorialChapter) {
  return [
    chapter.category,
    chapter.title,
    chapter.summary,
    ...chapter.details,
    chapter.tip ?? "",
    ...chapter.keywords,
    ...(chapter.phases?.map((phase) => `Phase ${phase.phase} ${phase.requirement}`) ?? [])
  ].join(" ").normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("de");
}

export function filterTutorialChapters(query: string) {
  const normalized = query.trim().normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("de");
  if (!normalized) return TUTORIAL_CHAPTERS.map((chapter, index) => ({ chapter, index }));
  return TUTORIAL_CHAPTERS
    .map((chapter, index) => ({ chapter, index }))
    .filter(({ chapter }) => searchableText(chapter).includes(normalized));
}
