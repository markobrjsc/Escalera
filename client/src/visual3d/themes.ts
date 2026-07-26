export type VisualScene = "access" | "list" | "lobby" | "game";

export type VisualSceneTheme = {
  accent: number;
  secondary: number;
  energy: number;
  cameraX: number;
  cameraY: number;
};

export const VISUAL_SCENE_THEMES: Record<VisualScene, VisualSceneTheme> = {
  access: {
    accent: 0x52796f,
    secondary: 0xd8b66a,
    energy: 0.42,
    cameraX: -0.18,
    cameraY: 0.16
  },
  list: {
    accent: 0x6b9c90,
    secondary: 0x8cd6b3,
    energy: 0.58,
    cameraX: 0.12,
    cameraY: 0.06
  },
  lobby: {
    accent: 0x8cd6b3,
    secondary: 0xd8b66a,
    energy: 0.72,
    cameraX: -0.08,
    cameraY: -0.03
  },
  game: {
    accent: 0x8cd6b3,
    secondary: 0xff7a7a,
    energy: 1,
    cameraX: 0,
    cameraY: -0.12
  }
};

export function normalizeVisualScene(scene: string): VisualScene {
  return scene in VISUAL_SCENE_THEMES ? scene as VisualScene : "access";
}
