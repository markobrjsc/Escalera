import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from "react";
import { api, message } from "../../lib/api.js";
import type { User } from "../../lib/types.js";
import { reducedMotionActive } from "../../lib/motion.js";
import { useAudio } from "../../audio.js";
import { TutorialProgress } from "./TutorialProgress/TutorialProgress.js";
import { tutorialKeyAction } from "./tutorial-keyboard.js";
import {
  ALL_TUTORIAL_CHAPTERS_MASK,
  TUTORIAL_CHAPTERS,
  chapterBit,
  clampTutorialStep,
  filterTutorialChapters,
  isChapterRead,
  readChapterCount
} from "./tutorial-content.js";

type SaveState = "idle" | "saving" | "saved" | "error";
type TutorialMode = "guided" | "reference";
type Spotlight = { left: number; top: number; width: number; height: number };

const focusableSelector = "button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex='-1'])";

export function TutorialDialog({ user, onUser, onClose }: { user: User; onUser: (user: User) => void; onClose: () => void }) {
  const { play: playAudio } = useAudio();
  const [step, setStep] = useState(() => clampTutorialStep(user.tutorialStep));
  const [readMask, setReadMask] = useState(user.tutorialReadMask ?? 0);
  const [mode, setMode] = useState<TutorialMode>(() => user.tutorialCompleted ? "reference" : "guided");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [spotlight, setSpotlight] = useState<Spotlight | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const userRef = useRef(user);
  const readMaskRef = useRef(readMask);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const openedTarget = useRef<HTMLElement | null>(null);
  userRef.current = user;
  readMaskRef.current = readMask;

  const current = TUTORIAL_CHAPTERS[step];
  const matches = useMemo(() => filterTutorialChapters(query), [query]);
  const readCount = readChapterCount(readMask);
  const remaining = TUTORIAL_CHAPTERS.length - readCount;

  const persistVisit = useCallback((nextStep: number, readChapter = nextStep) => {
    const normalizedStep = clampTutorialStep(nextStep);
    const nextMask = readMaskRef.current | chapterBit(readChapter);
    setStep(normalizedStep);
    setReadMask(nextMask);
    readMaskRef.current = nextMask;
    const optimistic = { ...userRef.current, tutorialStep: normalizedStep, tutorialReadMask: nextMask };
    userRef.current = optimistic;
    onUser(optimistic);
    setSaveState("saving");
    setError("");

    const request = saveQueue.current
      .catch(() => undefined)
      .then(async () => {
        const result = await api<{ user: User }>("/profile/tutorial", {
          method: "PUT",
          body: JSON.stringify({ step: normalizedStep, readChapter })
        });
        userRef.current = result.user;
        readMaskRef.current = result.user.tutorialReadMask;
        setReadMask(result.user.tutorialReadMask);
        onUser(result.user);
        setSaveState("saved");
        setError("");
      });
    saveQueue.current = request;
    request.catch((reason) => {
      setSaveState("error");
      setError(`Fortschritt konnte nicht gespeichert werden. ${message(reason)}`);
      playAudio("error");
    });
    return request;
  }, [onUser, playAudio]);

  const visit = useCallback((nextStep: number) => {
    playAudio("click", { intensity: .45 });
    contentRef.current?.scrollTo({ top: 0, behavior: reducedMotionActive() ? "auto" : "smooth" });
    void persistVisit(nextStep);
    window.requestAnimationFrame(() => headingRef.current?.focus());
  }, [persistVisit, playAudio]);

  const switchMode = (nextMode: TutorialMode) => {
    setMode(nextMode);
    playAudio("click", { intensity: .35 });
    if (nextMode === "reference") window.requestAnimationFrame(() => searchRef.current?.focus());
    else headingRef.current?.focus();
  };

  const pause = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await saveQueue.current.catch(() => persistVisit(step));
      playAudio("close");
      onClose();
    } catch {
      setBusy(false);
    }
  }, [busy, onClose, persistVisit, playAudio, step]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    headingRef.current?.focus();
    void persistVisit(step);
    return () => previous?.focus();
  }, []);

  useEffect(() => {
    const target = current.target
      ? document.querySelector<HTMLElement>(`[data-tutorial-target="${current.target}"]`)
      : null;
    openedTarget.current?.removeAttribute("data-tutorial-highlighted");
    openedTarget.current = target;
    if (!target) {
      setSpotlight(null);
      return;
    }
    target.setAttribute("data-tutorial-highlighted", "true");
    const measure = () => {
      const rect = target.getBoundingClientRect();
      setSpotlight(rect.width && rect.height ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(target);
    return () => {
      target.removeAttribute("data-tutorial-highlighted");
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer?.disconnect();
    };
  }, [current.target]);

  const reset = async () => {
    setBusy(true);
    setError("");
    try {
      await saveQueue.current.catch(() => undefined);
      const result = await api<{ user: User }>("/profile/tutorial/reset", { method: "POST", body: "{}" });
      userRef.current = result.user;
      readMaskRef.current = 0;
      setStep(0);
      setReadMask(0);
      setQuery("");
      setMode("guided");
      setSaveState("saved");
      onUser(result.user);
      playAudio("close");
      headingRef.current?.focus();
    } catch (reason) {
      setError(message(reason));
      playAudio("error");
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    const finalMask = readMaskRef.current | chapterBit(step);
    if (finalMask !== ALL_TUTORIAL_CHAPTERS_MASK) {
      const firstUnread = TUTORIAL_CHAPTERS.findIndex((_chapter, index) => !isChapterRead(finalMask, index));
      setError(`Noch ${TUTORIAL_CHAPTERS.length - readChapterCount(finalMask)} Kapitel offen. Wir springen zum ersten ungelesenen Kapitel.`);
      if (firstUnread >= 0) visit(firstUnread);
      return;
    }
    setBusy(true);
    setError("");
    try {
      await saveQueue.current.catch(() => undefined);
      const result = await api<{ user: User }>("/profile/tutorial/complete", {
        method: "POST",
        body: JSON.stringify({ step, readChapter: step })
      });
      onUser(result.user);
      playAudio("success");
      onClose();
    } catch (reason) {
      setError(message(reason));
      playAudio("error");
      setBusy(false);
    }
  };

  const keyboard = (event: ReactKeyboardEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const typing = target.matches("input, textarea, select");
    const action = tutorialKeyAction(event.key, step, TUTORIAL_CHAPTERS.length, typing);
    if (action === "pause") {
      event.preventDefault();
      void pause();
    } else if (action === "previous") {
      event.preventDefault();
      visit(step - 1);
    } else if (action === "next") {
      event.preventDefault();
      visit(step + 1);
    } else if (action === "search") {
      event.preventDefault();
      switchMode("reference");
    } else if (event.key === "Tab") {
      const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  const spotlightStyle = spotlight ? {
    "--tutorial-left": `${spotlight.left}px`,
    "--tutorial-top": `${spotlight.top}px`,
    "--tutorial-width": `${spotlight.width}px`,
    "--tutorial-height": `${spotlight.height}px`
  } as CSSProperties : undefined;

  return <div className="dialog-backdrop tutorial-backdrop" role="presentation">
    {spotlight && <div className="tutorial-spotlight" style={spotlightStyle} aria-hidden="true" />}
    <section
      ref={dialogRef}
      className="surface dialog tutorial-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tutorial-title"
      aria-describedby="tutorial-summary tutorial-shortcuts"
      onKeyDown={keyboard}
    >
      <header className="tutorial-header">
        <div>
          <p className="overline">Anleitung & Regelreferenz</p>
          <h2 id="tutorial-title" ref={headingRef} tabIndex={-1}>{current.title}</h2>
        </div>
        <div className="tutorial-header-actions">
          <div className="tutorial-mode-switch" role="group" aria-label="Tutorial-Modus">
            <button type="button" aria-pressed={mode === "guided"} onClick={() => switchMode("guided")}>Geführt</button>
            <button type="button" aria-pressed={mode === "reference"} onClick={() => switchMode("reference")}>Referenz</button>
          </div>
          <button className="button-icon tutorial-close" disabled={busy} onClick={() => void pause()} aria-label="Tutorial pausieren und schließen">×</button>
        </div>
      </header>

      <TutorialProgress count={TUTORIAL_CHAPTERS.length} step={step} readMask={readMask} />

      <div className={`tutorial-layout is-${mode}`}>
        {mode === "reference" && <aside className="tutorial-index" aria-label="Tutorial-Kapitel">
          <label className="tutorial-search">
            <span className="sr-only">Kapitel durchsuchen</span>
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Regeln durchsuchen …"
              aria-keyshortcuts="/"
            />
          </label>
          <nav aria-label="Kapitelreferenz">
            {matches.length
              ? <ol>{matches.map(({ chapter, index }) => <li key={chapter.id}>
                  <button
                    className={`${index === step ? "is-current" : ""} ${isChapterRead(readMask, index) ? "is-read" : ""}`}
                    aria-current={index === step ? "step" : undefined}
                    onClick={() => visit(index)}
                  >
                    <span className="tutorial-index-state" aria-label={isChapterRead(readMask, index) ? "Gelesen" : "Ungelesen"}>
                      {isChapterRead(readMask, index) ? "✓" : index + 1}
                    </span>
                    <span><small>{chapter.category}</small>{chapter.title}</span>
                  </button>
                </li>)}</ol>
              : <p className="tutorial-empty" role="status">Keine Kapitel gefunden.</p>}
          </nav>
        </aside>}

        <article className="tutorial-content" ref={contentRef}>
          <div className="tutorial-chapter-meta">
            <span>{current.category}</span>
            <span className={isChapterRead(readMask, step) ? "is-read" : ""}>
              {isChapterRead(readMask, step) ? "✓ Gelesen" : "Noch ungelesen"}
            </span>
            {current.targetLabel && <span>Im UI: {current.targetLabel}</span>}
          </div>
          <p id="tutorial-summary" className="tutorial-summary">{current.summary}</p>
          <ul className="tutorial-details">{current.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
          {current.phases && <div className="tutorial-phase-table" role="region" aria-label="Anforderungen aller sieben Phasen" tabIndex={0}>
            <table>
              <thead><tr><th scope="col">Phase</th><th scope="col">Anforderung</th></tr></thead>
              <tbody>{current.phases.map((phase) => <tr key={phase.phase}><th scope="row">{phase.phase}</th><td>{phase.requirement}</td></tr>)}</tbody>
            </table>
          </div>}
          {current.tip && <aside className="tutorial-tip"><strong>Tipp</strong><span>{current.tip}</span></aside>}
        </article>
      </div>

      {error && <p className="error tutorial-error" role="alert">{error}</p>}
      <p className="sr-only" id="tutorial-shortcuts">Pfeiltasten wechseln Kapitel, Schrägstrich öffnet die Suche und Escape pausiert das Tutorial.</p>
      <footer className="tutorial-footer">
        <div className="tutorial-secondary-actions">
          <button className="button-quiet" disabled={busy} onClick={() => void reset()}>Fortschritt zurücksetzen</button>
          <button className="button-quiet" disabled={busy} onClick={() => void pause()}>Pausieren</button>
          <span className={`tutorial-save-state is-${saveState}`} role="status" aria-live="polite">
            {saveState === "saving" ? "Speichert …" : saveState === "saved" ? "Gespeichert" : saveState === "error" ? "Nicht gespeichert" : ""}
          </span>
        </div>
        <div className="tutorial-actions">
          <button disabled={busy || step === 0} onClick={() => visit(step - 1)}>Zurück</button>
          {step < TUTORIAL_CHAPTERS.length - 1
            ? <button className="button-primary" disabled={busy} onClick={() => visit(step + 1)}>Weiter</button>
            : <button className="button-primary" disabled={busy} onClick={() => void finish()}>
                {remaining === 0 ? "Tutorial abschließen" : `${remaining} Kapitel offen`}
              </button>}
        </div>
      </footer>
    </section>
  </div>;
}
