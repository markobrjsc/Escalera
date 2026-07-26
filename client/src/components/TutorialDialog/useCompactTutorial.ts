import { useEffect, useState } from "react";

// Below this width the paginated layout (chapter index, mode switch, previous
// and next buttons) costs more room than it earns, so the dialog switches to a
// single scrollable feed.
export const COMPACT_TUTORIAL_QUERY = "(max-width: 760px)";

export function matchesCompactTutorial(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(COMPACT_TUTORIAL_QUERY).matches;
}

export function useCompactTutorial(): boolean {
  const [compact, setCompact] = useState(matchesCompactTutorial);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(COMPACT_TUTORIAL_QUERY);
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return compact;
}
