export type TutorialKeyAction = "pause" | "previous" | "next" | "search";

export function tutorialKeyAction(key: string, step: number, count: number, typing: boolean): TutorialKeyAction | null {
  if (key === "Escape") return "pause";
  if (typing) return null;
  if (key === "ArrowLeft" && step > 0) return "previous";
  if (key === "ArrowRight" && step < count - 1) return "next";
  if (key === "/") return "search";
  return null;
}
