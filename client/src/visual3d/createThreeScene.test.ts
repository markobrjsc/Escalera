import * as THREE from "three";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createThreeScene } from "./createThreeScene.js";

type RendererDouble = {
  render: ReturnType<typeof vi.fn>;
  resetState: ReturnType<typeof vi.fn>;
  setPixelRatio: ReturnType<typeof vi.fn>;
  setSize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  forceContextLoss: ReturnType<typeof vi.fn>;
};

const threeState = vi.hoisted(() => ({
  renderers: [] as RendererDouble[]
}));

vi.mock("three", async (importOriginal) => {
  const actual = await importOriginal<typeof import("three")>();

  class WebGLRenderer {
    outputColorSpace = "";
    toneMapping = 0;
    toneMappingExposure = 1;
    render = vi.fn();
    resetState = vi.fn();
    setClearColor = vi.fn();
    setPixelRatio = vi.fn();
    setSize = vi.fn();
    dispose = vi.fn();
    forceContextLoss = vi.fn();

    constructor() {
      threeState.renderers.push(this);
    }
  }

  return { ...actual, WebGLRenderer };
});

type BrowserListener = EventListenerOrEventListenerObject;

class BrowserEventTarget {
  private readonly listeners = new Map<string, Set<BrowserListener>>();

  addEventListener(type: string, listener: BrowserListener | null) {
    if (!listener) return;
    const entries = this.listeners.get(type) ?? new Set<BrowserListener>();
    entries.add(listener);
    this.listeners.set(type, entries);
  }

  removeEventListener(type: string, listener: BrowserListener | null) {
    if (!listener) return;
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Record<string, unknown> = {}) {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (typeof listener === "function") listener.call(this, event as unknown as Event);
      else listener.handleEvent(event as unknown as Event);
    }
  }

  listenerCount(type: string) {
    return this.listeners.get(type)?.size ?? 0;
  }
}

class BrowserWindow extends BrowserEventTarget {
  innerWidth = 1440;
  innerHeight = 900;
  devicePixelRatio = 2;
  readonly visualViewport = new BrowserEventTarget();
  private nextFrame = 1;
  private readonly frames = new Map<number, FrameRequestCallback>();

  matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }));

  requestAnimationFrame = (callback: FrameRequestCallback) => {
    const frame = this.nextFrame++;
    this.frames.set(frame, callback);
    return frame;
  };

  cancelAnimationFrame = (frame: number) => {
    this.frames.delete(frame);
  };

  get pendingFrames() {
    return this.frames.size;
  }

  runNextFrame(now: number) {
    const entry = this.frames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!entry) throw new Error("No animation frame queued");
    this.frames.delete(entry[0]);
    entry[1](now);
  }
}

class BrowserDocument extends BrowserEventTarget {
  hidden = false;
}

class BrowserCanvas extends BrowserEventTarget {
  readonly dataset: DOMStringMap = {};
}

let browserWindow: BrowserWindow;
let browserDocument: BrowserDocument;
let canvas: BrowserCanvas;

function renderer() {
  const current = threeState.renderers.at(-1);
  if (!current) throw new Error("Renderer was not created");
  return current;
}

function createScene(scene: "access" | "list" | "lobby" | "game", reducedMotion = false) {
  const statuses: string[] = [];
  const controller = createThreeScene({
    canvas: canvas as unknown as HTMLCanvasElement,
    scene,
    reducedMotion,
    onStatus: (status) => statuses.push(status)
  });
  return { controller, statuses };
}

beforeEach(() => {
  threeState.renderers.length = 0;
  browserWindow = new BrowserWindow();
  browserDocument = new BrowserDocument();
  canvas = new BrowserCanvas();
  vi.stubGlobal("window", browserWindow);
  vi.stubGlobal("document", browserDocument);
  vi.stubGlobal("navigator", {
    hardwareConcurrency: 12,
    deviceMemory: 16,
    connection: { saveData: false }
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createThreeScene lifecycle", () => {
  it("renders a non-game scene once without keeping a RAF loop alive", () => {
    const { controller, statuses } = createScene("lobby");

    expect(statuses).toEqual(["ready"]);
    expect(renderer().render).toHaveBeenCalledOnce();
    expect(browserWindow.pendingFrames).toBe(0);

    browserWindow.emit("pointermove", { clientX: 1000, clientY: 300 });
    expect(browserWindow.pendingFrames).toBe(1);
    browserWindow.runNextFrame(16);

    expect(renderer().render).toHaveBeenCalledTimes(2);
    expect(browserWindow.pendingFrames).toBe(0);
    controller.dispose();
  });

  it("hands a pending static frame to the game loop without duplicating RAF requests", () => {
    const { controller } = createScene("access");
    const currentRenderer = renderer();

    browserWindow.emit("pointermove", { clientX: 1200, clientY: 200 });
    expect(browserWindow.pendingFrames).toBe(1);

    controller.setScene("game");
    expect(browserWindow.pendingFrames).toBe(1);

    browserWindow.runNextFrame(16);
    expect(currentRenderer.render).toHaveBeenCalledOnce();
    expect(browserWindow.pendingFrames).toBe(1);

    browserWindow.runNextFrame(32);
    expect(currentRenderer.render).toHaveBeenCalledTimes(2);
    expect(browserWindow.pendingFrames).toBe(1);
    controller.dispose();
  });

  it("keeps the game scene animating while respecting the frame scheduler", () => {
    const { controller } = createScene("game");
    const currentRenderer = renderer();

    expect(currentRenderer.render).toHaveBeenCalledOnce();
    expect(browserWindow.pendingFrames).toBe(1);

    browserWindow.runNextFrame(16);
    expect(currentRenderer.render).toHaveBeenCalledTimes(2);
    expect(browserWindow.pendingFrames).toBe(1);

    browserWindow.runNextFrame(33);
    expect(currentRenderer.render).toHaveBeenCalledTimes(3);
    expect(browserWindow.pendingFrames).toBe(1);
    controller.dispose();
  });

  it("pauses all scheduled work while hidden and resumes the game when visible", () => {
    const { controller } = createScene("game");
    const currentRenderer = renderer();

    browserWindow.emit("resize");
    expect(browserWindow.pendingFrames).toBe(2);

    browserDocument.hidden = true;
    browserDocument.emit("visibilitychange");
    expect(browserWindow.pendingFrames).toBe(0);

    browserDocument.hidden = false;
    browserDocument.emit("visibilitychange");
    expect(currentRenderer.setSize).toHaveBeenLastCalledWith(1440, 900, false);
    expect(browserWindow.pendingFrames).toBe(1);

    browserWindow.runNextFrame(16);
    expect(currentRenderer.render).toHaveBeenCalledTimes(2);
    controller.dispose();
  });

  it("coalesces window and visual viewport resize events into one static render", () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
    const { controller } = createScene("list");
    const currentRenderer = renderer();

    browserWindow.innerWidth = 800;
    browserWindow.innerHeight = 500;
    browserWindow.emit("resize");
    browserWindow.emit("resize");
    browserWindow.visualViewport.emit("resize");

    expect(browserWindow.pendingFrames).toBe(1);
    browserWindow.runNextFrame(16);

    expect(currentRenderer.setSize).toHaveBeenLastCalledWith(800, 500, false);
    expect(currentRenderer.render).toHaveBeenCalledTimes(2);
    expect(canvas.dataset.quality).toBe("balanced");
    expect(geometryDispose).toHaveBeenCalledTimes(2);
    expect(browserWindow.pendingFrames).toBe(0);
    controller.dispose();
  });

  it("pauses on context loss and restores rendering and animation", () => {
    const { controller, statuses } = createScene("game");
    const currentRenderer = renderer();
    const preventDefault = vi.fn();

    canvas.emit("webglcontextlost", { preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    expect(statuses).toEqual(["ready", "lost"]);
    expect(browserWindow.pendingFrames).toBe(0);

    canvas.emit("webglcontextrestored");
    expect(currentRenderer.resetState).toHaveBeenCalledOnce();
    expect(currentRenderer.render).toHaveBeenCalledTimes(2);
    expect(statuses).toEqual(["ready", "lost", "ready"]);
    expect(browserWindow.pendingFrames).toBe(1);
    controller.dispose();
  });

  it("falls back and releases resources when context restoration fails", () => {
    const geometryDispose = vi.spyOn(THREE.BufferGeometry.prototype, "dispose");
    const materialDispose = vi.spyOn(THREE.Material.prototype, "dispose");
    const { controller, statuses } = createScene("game");
    const currentRenderer = renderer();
    currentRenderer.resetState.mockImplementationOnce(() => {
      throw new Error("restore failed");
    });

    canvas.emit("webglcontextlost", { preventDefault: vi.fn() });
    canvas.emit("webglcontextrestored");

    expect(statuses).toEqual(["ready", "lost", "fallback"]);
    expect(browserWindow.pendingFrames).toBe(0);
    expect(geometryDispose).toHaveBeenCalled();
    expect(materialDispose).toHaveBeenCalled();
    expect(currentRenderer.dispose).toHaveBeenCalledOnce();
    expect(currentRenderer.forceContextLoss).toHaveBeenCalledOnce();
    expect(canvas.listenerCount("webglcontextrestored")).toBe(0);

    controller.dispose();
    expect(currentRenderer.dispose).toHaveBeenCalledOnce();
  });

  it("dispose cancels work, removes listeners, and releases resources exactly once", () => {
    const { controller } = createScene("game");
    const currentRenderer = renderer();
    browserWindow.emit("resize");

    controller.dispose();

    expect(browserWindow.pendingFrames).toBe(0);
    expect(browserWindow.listenerCount("resize")).toBe(0);
    expect(browserWindow.visualViewport.listenerCount("resize")).toBe(0);
    expect(browserDocument.listenerCount("visibilitychange")).toBe(0);
    expect(canvas.listenerCount("webglcontextlost")).toBe(0);
    expect(currentRenderer.dispose).toHaveBeenCalledOnce();
    expect(currentRenderer.forceContextLoss).toHaveBeenCalledOnce();

    controller.dispose();
    expect(currentRenderer.dispose).toHaveBeenCalledOnce();
  });
});
