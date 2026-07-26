export type VisualQualityTier = "economy" | "balanced" | "high";

export type VisualCapabilities = {
  width: number;
  height: number;
  devicePixelRatio: number;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
  coarsePointer: boolean;
  saveData: boolean;
  reducedMotion: boolean;
};

export type VisualQualityProfile = {
  tier: VisualQualityTier;
  maxDpr: number;
  maxFps: number;
  cardCount: number;
  particleCount: number;
  antialias: boolean;
  animated: boolean;
};

const PROFILES: Record<VisualQualityTier, Omit<VisualQualityProfile, "animated">> = {
  economy: {
    tier: "economy",
    maxDpr: 1,
    maxFps: 24,
    cardCount: 4,
    particleCount: 24,
    antialias: false
  },
  balanced: {
    tier: "balanced",
    maxDpr: 1.25,
    maxFps: 40,
    cardCount: 7,
    particleCount: 48,
    antialias: true
  },
  high: {
    tier: "high",
    maxDpr: 1.75,
    maxFps: 60,
    cardCount: 10,
    particleCount: 72,
    antialias: true
  }
};

export function resolveVisualQuality(capabilities: VisualCapabilities): VisualQualityProfile {
  const shortEdge = Math.min(capabilities.width, capabilities.height);
  const lowMemory = capabilities.deviceMemory !== null && capabilities.deviceMemory <= 4;
  const lowConcurrency = capabilities.hardwareConcurrency !== null && capabilities.hardwareConcurrency <= 4;
  const constrainedViewport = capabilities.coarsePointer && shortEdge < 600;

  let tier: VisualQualityTier;
  if (capabilities.saveData || lowMemory || lowConcurrency || constrainedViewport) {
    tier = "economy";
  } else {
    const capableDevice =
      shortEdge >= 700 &&
      !capabilities.coarsePointer &&
      (capabilities.hardwareConcurrency === null || capabilities.hardwareConcurrency >= 8) &&
      (capabilities.deviceMemory === null || capabilities.deviceMemory >= 8);
    tier = capableDevice ? "high" : "balanced";
  }

  const profile = PROFILES[tier];
  return {
    ...profile,
    maxDpr: Math.min(profile.maxDpr, Math.max(1, capabilities.devicePixelRatio)),
    maxFps: capabilities.reducedMotion ? 0 : profile.maxFps,
    animated: !capabilities.reducedMotion
  };
}

type NavigatorWithHints = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

export function readVisualCapabilities(reducedMotion: boolean): VisualCapabilities {
  const browserNavigator = navigator as NavigatorWithHints;
  return {
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight),
    devicePixelRatio: Math.max(1, window.devicePixelRatio || 1),
    hardwareConcurrency: browserNavigator.hardwareConcurrency || null,
    deviceMemory: browserNavigator.deviceMemory || null,
    coarsePointer: window.matchMedia?.("(pointer: coarse)").matches ?? false,
    saveData: browserNavigator.connection?.saveData ?? false,
    reducedMotion
  };
}
