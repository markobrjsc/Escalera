export type WebGLCanvasLike = {
  getContext: (contextId: string, options?: Record<string, unknown>) => unknown;
};

type DisposableWebGLContext = {
  getExtension?: (name: string) => { loseContext?: () => void } | null;
};

export function acquireWebGL2Context(
  canvas: WebGLCanvasLike,
  options: Record<string, unknown> = { powerPreference: "low-power" }
) {
  try {
    return canvas.getContext("webgl2", options) as DisposableWebGLContext | null;
  } catch {
    return null;
  }
}

export function releaseWebGLContext(context: DisposableWebGLContext | null) {
  context?.getExtension?.("WEBGL_lose_context")?.loseContext?.();
}

export function supportsWebGL(
  createCanvas: () => WebGLCanvasLike = () => document.createElement("canvas")
): boolean {
  let canvas: WebGLCanvasLike;
  try {
    canvas = createCanvas();
  } catch {
    return false;
  }

  // Three.js r185 WebGLRenderer requires WebGL2. Treat WebGL1-only devices as
  // fallback clients instead of starting a renderer that is guaranteed to fail.
  const context = acquireWebGL2Context(canvas);
  releaseWebGLContext(context);
  return Boolean(context);
}
