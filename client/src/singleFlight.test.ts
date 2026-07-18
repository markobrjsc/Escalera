import { describe, expect, it, vi } from "vitest";
import { runSingleFlight } from "./singleFlight.js";

describe("Aktionsschutz", () => {
  it("führt schnelle Mehrfachklicks höchstens einmal aus", async () => {
    const gate = { current: false };
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const operation = vi.fn(async () => pending);

    const first = runSingleFlight(gate, operation);
    const duplicate = runSingleFlight(gate, operation);

    expect(operation).toHaveBeenCalledTimes(1);
    await expect(duplicate).resolves.toBeUndefined();
    release();
    await first;
  });

  it("gibt die Aktion nach einem Fehler für den nächsten Klick wieder frei", async () => {
    const gate = { current: false };
    await expect(runSingleFlight(gate, async () => { throw new Error("abgelehnt"); })).rejects.toThrow("abgelehnt");
    await expect(runSingleFlight(gate, async () => "gekauft")).resolves.toBe("gekauft");
  });
});
