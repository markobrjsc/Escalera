import { describe, expect, it, vi } from "vitest";
import { supportsWebGL } from "./webgl.js";

describe("WebGL-Erkennung", () => {
  it("erkennt einen verfügbaren Kontext und gibt den Testkontext frei", () => {
    const loseContext = vi.fn();
    const getContext = vi.fn((kind: string) => kind === "webgl2"
      ? { getExtension: () => ({ loseContext }) }
      : null);

    expect(supportsWebGL(() => ({ getContext }))).toBe(true);
    expect(loseContext).toHaveBeenCalledOnce();
  });

  it("fällt bei fehlendem oder fehlerhaftem WebGL sicher zurück", () => {
    expect(supportsWebGL(() => ({ getContext: () => null }))).toBe(false);
    expect(supportsWebGL(() => ({ getContext: () => { throw new Error("blocked"); } }))).toBe(false);
  });

  it("nutzt bei WebGL1-only sicher den CSS-Fallback", () => {
    const getContext = vi.fn((contextId: string) =>
      contextId === "webgl" ? { getExtension: () => null } : null
    );
    expect(supportsWebGL(() => ({
      getContext
    }))).toBe(false);
    expect(getContext).toHaveBeenCalledOnce();
    expect(getContext).toHaveBeenCalledWith("webgl2", { powerPreference: "low-power" });
  });
});
