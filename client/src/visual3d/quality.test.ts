import { describe, expect, it } from "vitest";
import { resolveVisualQuality, type VisualCapabilities } from "./quality.js";

const capableDesktop: VisualCapabilities = {
  width: 1440,
  height: 900,
  devicePixelRatio: 2.5,
  hardwareConcurrency: 12,
  deviceMemory: 16,
  coarsePointer: false,
  saveData: false,
  reducedMotion: false
};

describe("Three.js-Qualitätssteuerung", () => {
  it("begrenzt Auflösung und Framerate auf leistungsfähigen Geräten", () => {
    expect(resolveVisualQuality(capableDesktop)).toMatchObject({
      tier: "high",
      maxDpr: 1.75,
      maxFps: 60,
      animated: true
    });
  });

  it("reduziert Last auf mobilen oder ressourcenarmen Geräten", () => {
    expect(resolveVisualQuality({
      ...capableDesktop,
      width: 390,
      height: 844,
      hardwareConcurrency: 4,
      deviceMemory: 4,
      coarsePointer: true
    })).toMatchObject({
      tier: "economy",
      maxDpr: 1,
      maxFps: 24,
      cardCount: 4,
      antialias: false
    });
  });

  it("respektiert Reduced Motion mit einem statischen Frame", () => {
    expect(resolveVisualQuality({ ...capableDesktop, reducedMotion: true })).toMatchObject({
      tier: "high",
      maxFps: 0,
      animated: false
    });
  });

  it("respektiert den Datensparmodus unabhängig von der Hardware", () => {
    expect(resolveVisualQuality({ ...capableDesktop, saveData: true }).tier).toBe("economy");
  });
  it("begrenzt grobe Pointer auf Tablets auf die mittlere Stufe", () => {
    expect(resolveVisualQuality({
      ...capableDesktop,
      width: 1280,
      height: 800,
      coarsePointer: true
    })).toMatchObject({
      tier: "balanced",
      maxDpr: 1.25,
      antialias: true
    });
  });
});
