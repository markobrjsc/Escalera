import { useEffect, useRef } from "react";
import { TutorialChapterBody } from "../TutorialChapterBody/TutorialChapterBody.js";
import { TUTORIAL_CHAPTERS, isChapterRead } from "../tutorial-content.js";

// The compact layout: every chapter below one another in a single scroll, with
// no pagination controls at all. Scrolling is the navigation — the chapter that
// fills the viewport reports itself, which keeps the stored progress alive
// without asking anyone to press "Weiter".
export function TutorialFeed({ readMask, onReach }: { readMask: number; onReach: (index: number) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const reached = useRef(-1);
  const onReachRef = useRef(onReach);
  onReachRef.current = onReach;

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof IntersectionObserver !== "function") return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const index = Number((entry.target as HTMLElement).dataset.chapter);
        if (!Number.isFinite(index) || index <= reached.current) continue;
        reached.current = index;
        onReachRef.current(index);
      }
    }, { threshold: .55 });
    list.querySelectorAll("[data-chapter]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  return <div className="tutorial-feed" ref={listRef} tabIndex={0}>
    {TUTORIAL_CHAPTERS.map((chapter, index) => <article
      className="tutorial-feed-chapter"
      key={chapter.id}
      data-chapter={index}
      aria-labelledby={`tutorial-feed-${chapter.id}`}
    >
      <TutorialChapterBody
        chapter={chapter}
        read={isChapterRead(readMask, index)}
        headingId={`tutorial-feed-${chapter.id}`}
        summaryId={index === 0 ? "tutorial-summary" : undefined}
      />
    </article>)}
  </div>;
}
