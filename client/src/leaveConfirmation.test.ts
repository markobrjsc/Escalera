import { describe, expect, it } from "vitest";
import { requiresLeaveConfirmation } from "./leaveConfirmation.js";

describe("Partie verlassen", () => {
  it("bestätigt nur das Verlassen einer laufenden Partie", () => {
    expect(requiresLeaveConfirmation("ACTIVE")).toBe(true);
    expect(requiresLeaveConfirmation("FINISHED")).toBe(false);
  });
});
