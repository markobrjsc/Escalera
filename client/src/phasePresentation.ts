export const PHASE_REQUIREMENTS: Record<number, string> = {
  1: "3 gleiche Werte",
  2: "2 × 3 gleiche Werte",
  3: "4 gleiche Werte",
  4: "2 × 4 gleiche Werte",
  5: "5 gleiche Werte",
  6: "2 × 5 gleiche Werte",
  7: "7er-Straße · gleiches Zeichen"
};

export function phaseRequirement(phase: number) {
  return PHASE_REQUIREMENTS[phase] ?? "Phasenziel ansehen";
}
