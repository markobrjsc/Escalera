import { isChapterRead, readChapterCount } from "../tutorial-content.js";

export function TutorialProgress({ count, step, readMask = 0 }: { count: number; step: number; readMask?: number }) {
  const read = readChapterCount(readMask);
  return <div className="tutorial-progress">
    <div className="tutorial-progress-label"><span>Kapitel {step + 1} von {count}</span><strong>{read} gelesen</strong></div>
    <div className="tutorial-progress-track" role="progressbar" aria-label="Gelesene Tutorial-Kapitel" aria-valuemin={0} aria-valuemax={count} aria-valuenow={read}>
      {Array.from({ length: count }, (_, index) => <span className={`${index === step ? "is-current" : ""} ${isChapterRead(readMask, index) ? "is-read" : ""}`} key={index} />)}
    </div>
  </div>;
}
