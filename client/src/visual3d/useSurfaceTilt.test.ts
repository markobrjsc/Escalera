import { describe, expect, it, vi } from "vitest";
import { calculateSurfaceTilt } from "./useSurfaceTilt.js";
import { bindSurfaceTilt } from "./useSurfaceTilt.js";

const rect = { left: 100, top: 50, width: 200, height: 100 };

describe("calculateSurfaceTilt", () => {
  it("bleibt im Mittelpunkt neutral", () => {
    expect(calculateSurfaceTilt(200, 100, rect)).toEqual({
      rotateX: 0,
      rotateY: 0,
      axisX: 0,
      axisY: 1,
      angle: 0
    });
  });

  it("neigt und beleuchtet die Oberfläche zur Zeigerposition", () => {
    expect(calculateSurfaceTilt(300, 50, rect, 4)).toEqual({
      rotateX: 2.828,
      rotateY: 2.828,
      axisX: .707,
      axisY: .707,
      angle: 4
    });
  });

  it("begrenzt Positionen außerhalb der Oberfläche", () => {
    const tilt = calculateSurfaceTilt(-500, 800, rect, 3);
    expect(tilt.rotateX).toBe(-2.121);
    expect(tilt.rotateY).toBe(-2.121);
    expect(tilt.angle).toBe(3);
  });

  it("liefert für degenerierte Flächen eine stabile Neutralstellung", () => {
    expect(calculateSurfaceTilt(0, 0, { ...rect, width: 0 })).toMatchObject({
      rotateX: 0,
      rotateY: 0,
      angle: 0
    });
  });
});

type TiltListener = EventListenerOrEventListenerObject;

class TiltEventTarget {
  private readonly listeners = new Map<string, Set<TiltListener>>();

  addEventListener(type: string, listener: TiltListener | null) {
    if (!listener) return;
    const entries = this.listeners.get(type) ?? new Set<TiltListener>();
    entries.add(listener);
    this.listeners.set(type, entries);
  }

  removeEventListener(type: string, listener: TiltListener | null) {
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

class TiltClassList {
  private readonly values = new Set<string>();

  add(...names: string[]) {
    names.forEach((name) => this.values.add(name));
  }

  remove(...names: string[]) {
    names.forEach((name) => this.values.delete(name));
  }

  contains(name: string) {
    return this.values.has(name);
  }
}

class TiltStyle {
  private readonly values = new Map<string, string>();

  setProperty(name: string, value: string) {
    this.values.set(name, value);
  }

  removeProperty(name: string) {
    const previous = this.values.get(name) ?? "";
    this.values.delete(name);
    return previous;
  }

  getPropertyValue(name: string) {
    return this.values.get(name) ?? "";
  }
}

class TiltNode extends TiltEventTarget {
  parentNode: TiltNode | null = null;
}

class TiltElement extends TiltNode {}

class TiltHTMLElement extends TiltElement {
  readonly nodeType = 1;
  readonly classList = new TiltClassList();
  readonly style = new TiltStyle();
  ownerDocument!: TiltDocument;
  isConnected = true;
  tiltSurface = false;

  closest() {
    let node: TiltNode | null = this;
    while (node) {
      if (node instanceof TiltHTMLElement && node.tiltSurface) return node;
      node = node.parentNode;
    }
    return null;
  }

  contains(node: TiltNode) {
    let current: TiltNode | null = node;
    while (current) {
      if (current === this) return true;
      current = current.parentNode;
    }
    return false;
  }

  getBoundingClientRect() {
    return { left: 100, top: 50, width: 200, height: 100 };
  }
}

class TiltMediaQuery extends TiltEventTarget {
  matches = false;
}

class TiltView extends TiltEventTarget {
  readonly Element = TiltElement;
  readonly HTMLElement = TiltHTMLElement;
  readonly Node = TiltNode;
  readonly media = new TiltMediaQuery();
  private nextFrame = 1;
  private readonly frames = new Map<number, FrameRequestCallback>();

  matchMedia = vi.fn(() => this.media);

  requestAnimationFrame = (callback: FrameRequestCallback) => {
    const frame = this.nextFrame++;
    this.frames.set(frame, callback);
    return frame;
  };

  cancelAnimationFrame = (frame: number) => {
    this.frames.delete(frame);
  };

  runFrame() {
    const entry = this.frames.entries().next().value as [number, FrameRequestCallback] | undefined;
    if (!entry) throw new Error("No animation frame queued");
    this.frames.delete(entry[0]);
    entry[1](16);
  }

  get pendingFrames() {
    return this.frames.size;
  }
}

class TiltDocument extends TiltEventTarget {
  readonly nodeType = 9;
  readonly documentElement = new TiltHTMLElement();

  constructor(readonly defaultView: TiltView) {
    super();
    this.documentElement.ownerDocument = this;
  }
}

function tiltFixture() {
  const view = new TiltView();
  const document = new TiltDocument(view);
  const root = new TiltHTMLElement();
  const surface = new TiltHTMLElement();
  const child = new TiltHTMLElement();
  root.ownerDocument = document;
  surface.ownerDocument = document;
  child.ownerDocument = document;
  surface.tiltSurface = true;
  surface.parentNode = root;
  child.parentNode = surface;
  return { view, document, root, surface, child };
}

describe("bindSurfaceTilt", () => {
  it("delegates nested pointer movement and clears the previous surface", () => {
    const fixture = tiltFixture();
    const cleanup = bindSurfaceTilt(
      fixture.root as unknown as HTMLElement,
      { selector: ".tilt", maxAngle: 4 }
    );

    fixture.root.emit("pointermove", {
      target: fixture.child,
      pointerType: "mouse",
      clientX: 300,
      clientY: 50
    });
    expect(fixture.view.pendingFrames).toBe(1);
    fixture.view.runFrame();

    expect(fixture.surface.classList.contains("is-depth-active")).toBe(true);
    expect(fixture.surface.style.getPropertyValue("--depth-axis-x")).toBe("0.707");
    expect(fixture.surface.style.getPropertyValue("--depth-axis-y")).toBe("0.707");

    fixture.root.emit("pointerout", { target: fixture.child, relatedTarget: null });
    expect(fixture.surface.classList.contains("is-depth-active")).toBe(false);
    expect(fixture.surface.style.getPropertyValue("--depth-angle")).toBe("");
    cleanup();
  });

  it("cancels pending work, resets styles, and removes every listener on cleanup", () => {
    const fixture = tiltFixture();
    const cleanup = bindSurfaceTilt(fixture.root as unknown as HTMLElement, { selector: ".tilt" });

    fixture.root.emit("pointermove", {
      target: fixture.child,
      pointerType: "pen",
      clientX: 240,
      clientY: 80
    });
    fixture.view.runFrame();
    fixture.root.emit("pointermove", {
      target: fixture.child,
      pointerType: "mouse",
      clientX: 260,
      clientY: 90
    });
    expect(fixture.view.pendingFrames).toBe(1);

    cleanup();

    expect(fixture.view.pendingFrames).toBe(0);
    expect(fixture.surface.classList.contains("is-depth-active")).toBe(false);
    expect(fixture.root.listenerCount("pointermove")).toBe(0);
    expect(fixture.root.listenerCount("pointerout")).toBe(0);
    expect(fixture.root.listenerCount("pointercancel")).toBe(0);
    expect(fixture.view.listenerCount("blur")).toBe(0);
    expect(fixture.view.media.listenerCount("change")).toBe(0);

    fixture.root.emit("pointermove", {
      target: fixture.child,
      pointerType: "mouse",
      clientX: 200,
      clientY: 100
    });
    expect(fixture.view.pendingFrames).toBe(0);
  });

  it("honors reduced motion while allowing the motion-full override", () => {
    const fixture = tiltFixture();
    fixture.view.media.matches = true;
    fixture.document.documentElement.classList.add("motion-reduced");
    const cleanup = bindSurfaceTilt(fixture.document as unknown as Document, { selector: ".tilt" });

    fixture.document.emit("pointermove", {
      target: fixture.child,
      pointerType: "mouse",
      clientX: 300,
      clientY: 50
    });
    expect(fixture.view.pendingFrames).toBe(0);

    fixture.document.documentElement.classList.remove("motion-reduced");
    fixture.document.documentElement.classList.add("motion-full");
    fixture.document.emit("pointermove", {
      target: fixture.child,
      pointerType: "mouse",
      clientX: 300,
      clientY: 50
    });
    fixture.view.runFrame();

    expect(fixture.surface.classList.contains("is-depth-active")).toBe(true);
    cleanup();
  });
});
