import type { TutorialChapter } from "../tutorial-content.js";

// The readable body of one tutorial chapter. Shared by the paginated desktop
// view and the compact feed, so both stay in sync automatically.
export function TutorialChapterBody({ chapter, read, summaryId, headingId }: { chapter: TutorialChapter; read: boolean; summaryId?: string; headingId?: string }) {
  return <>
    {headingId && <h3 className="tutorial-chapter-heading" id={headingId}>{chapter.title}</h3>}
    <div className="tutorial-chapter-meta">
      <span>{chapter.category}</span>
      <span className={read ? "is-read" : ""}>{read ? "✓ Gelesen" : "Noch ungelesen"}</span>
      {chapter.targetLabel && <span>Im UI: {chapter.targetLabel}</span>}
    </div>
    <p id={summaryId} className="tutorial-summary">{chapter.summary}</p>
    <ul className="tutorial-details">{chapter.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
    {chapter.phases && <div className="tutorial-phase-table" role="region" aria-label="Anforderungen aller sieben Phasen" tabIndex={0}>
      <table>
        <thead><tr><th scope="col">Phase</th><th scope="col">Anforderung</th></tr></thead>
        <tbody>{chapter.phases.map((phase) => <tr key={phase.phase}><th scope="row">{phase.phase}</th><td>{phase.requirement}</td></tr>)}</tbody>
      </table>
    </div>}
    {chapter.tip && <aside className="tutorial-tip"><strong>Tipp</strong><span>{chapter.tip}</span></aside>}
  </>;
}
