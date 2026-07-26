import { useEffect } from "react";

export const SURFACE_TILT_SELECTOR = [
  ".login-card",
  ".lobby-browser",
  ".lobby-card",
  ".members-panel",
  ".member-card",
  ".dialog",
  ".game-menu",
  ".player-interaction-card",
  // .result-panel is intentionally absent: it scrolls and holds the score
  // history's sticky first/last columns, which mis-resolve while an ancestor is
  // rotated inside a perspective. See the note in styles/depth-system.css.
  ".turn-order-player",
  ".active-player-hud",
  ".meld-card",
  ".tree-tile",
  ".achievement-toast",
  ".pile-design-panel",
  ".dev-tile",
  ".dev-canvas"
].join(",");

export type SurfaceTilt = {
  rotateX: number;
  rotateY: number;
  axisX: number;
  axisY: number;
  angle: number;
};

type TiltRect = Pick<DOMRectReadOnly, "left" | "top" | "width" | "height">;

export type SurfaceTiltOptions = {
  enabled?: boolean;
  maxAngle?: number;
  selector?: string;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const tidy = (value: number) =>
  Math.abs(value) < .0005 ? 0 : Number(value.toFixed(3));

export function calculateSurfaceTilt(
  clientX: number,
  clientY: number,
  rect: TiltRect,
  maxAngle = 2.5
): SurfaceTilt {
  if (rect.width <= 0 || rect.height <= 0 || maxAngle <= 0) {
    return { rotateX: 0, rotateY: 0, axisX: 0, axisY: 1, angle: 0 };
  }

  const normalizedX = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
  const normalizedY = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
  const rawRotateX = -normalizedY;
  const rawRotateY = normalizedX;
  const magnitude = Math.hypot(rawRotateX, rawRotateY);
  const scale = magnitude === 0 ? 0 : Math.min(1, magnitude) / magnitude;
  const rotateX = rawRotateX * maxAngle * scale;
  const rotateY = rawRotateY * maxAngle * scale;
  const angle = Math.hypot(rotateX, rotateY);

  return {
    rotateX: tidy(rotateX),
    rotateY: tidy(rotateY),
    axisX: angle === 0 ? 0 : tidy(rotateX / angle),
    axisY: angle === 0 ? 1 : tidy(rotateY / angle),
    angle: tidy(angle)
  };
}

function resetSurface(surface: HTMLElement | null) {
  if (!surface) return;
  surface.classList.remove("is-depth-active");
  for (const property of [
    "--depth-axis-x",
    "--depth-axis-y",
    "--depth-angle"
  ]) surface.style.removeProperty(property);
}

function writeSurfaceTilt(surface: HTMLElement, tilt: SurfaceTilt) {
  surface.style.setProperty("--depth-axis-x", String(tilt.axisX));
  surface.style.setProperty("--depth-axis-y", String(tilt.axisY));
  surface.style.setProperty("--depth-angle", `${tilt.angle}deg`);
  surface.classList.add("is-depth-active");
}

export function bindSurfaceTilt(
  root: Document | HTMLElement,
  { enabled = true, maxAngle = 2.5, selector = SURFACE_TILT_SELECTOR }: SurfaceTiltOptions = {}
) {
  if (!enabled) return () => undefined;

  const ownerDocument = root.nodeType === 9 ? root as Document : (root as HTMLElement).ownerDocument;
  const rootElement = root.nodeType === 1 ? root as HTMLElement : null;
  const view = ownerDocument.defaultView;
  if (!view) return () => undefined;

  const eventTarget: EventTarget = root;
  const reducedMotion = typeof view.matchMedia === "function"
    ? view.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  let activeSurface: HTMLElement | null = null;
  let pending: { surface: HTMLElement; clientX: number; clientY: number } | null = null;
  let frame = 0;

  const motionDisabled = () =>
    ownerDocument.documentElement.classList.contains("motion-reduced");

  const clearActive = () => {
    pending = null;
    if (frame) view.cancelAnimationFrame(frame);
    frame = 0;
    resetSurface(activeSurface);
    activeSurface = null;
  };

  const render = () => {
    frame = 0;
    const next = pending;
    pending = null;
    if (
      !next ||
      !next.surface.isConnected ||
      (rootElement !== null && !rootElement.contains(next.surface)) ||
      motionDisabled()
    ) {
      clearActive();
      return;
    }
    writeSurfaceTilt(
      next.surface,
      calculateSurfaceTilt(next.clientX, next.clientY, next.surface.getBoundingClientRect(), maxAngle)
    );
  };

  const findSurface = (event: Event) => {
    const target = event.target;
    if (!(target instanceof view.Element)) return null;
    const surface = target.closest(selector);
    if (!(surface instanceof view.HTMLElement)) return null;
    if (rootElement && !rootElement.contains(surface)) return null;
    return surface;
  };

  const onPointerMove = (event: Event) => {
    const pointer = event as PointerEvent;
    if ((pointer.pointerType !== "mouse" && pointer.pointerType !== "pen") || motionDisabled()) {
      clearActive();
      return;
    }

    const surface = findSurface(event);
    if (!surface) {
      clearActive();
      return;
    }
    if (activeSurface !== surface) {
      resetSurface(activeSurface);
      activeSurface = surface;
    }
    pending = { surface, clientX: pointer.clientX, clientY: pointer.clientY };
    if (!frame) frame = view.requestAnimationFrame(render);
  };

  const onPointerOut = (event: Event) => {
    const surface = findSurface(event);
    if (!surface || surface !== activeSurface) return;
    const related = (event as PointerEvent).relatedTarget;
    if (related instanceof view.Node && surface.contains(related)) return;
    clearActive();
  };

  eventTarget.addEventListener("pointermove", onPointerMove, { passive: true });
  eventTarget.addEventListener("pointerout", onPointerOut, { passive: true });
  eventTarget.addEventListener("pointercancel", clearActive, { passive: true });
  view.addEventListener("blur", clearActive);
  reducedMotion?.addEventListener?.("change", clearActive);

  return () => {
    clearActive();
    eventTarget.removeEventListener("pointermove", onPointerMove);
    eventTarget.removeEventListener("pointerout", onPointerOut);
    eventTarget.removeEventListener("pointercancel", clearActive);
    view.removeEventListener("blur", clearActive);
    reducedMotion?.removeEventListener?.("change", clearActive);
  };
}

export function useSurfaceTilt({
  enabled = true,
  maxAngle = 2.5,
  selector = SURFACE_TILT_SELECTOR
}: SurfaceTiltOptions = {}) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    return bindSurfaceTilt(document, { enabled, maxAngle, selector });
  }, [enabled, maxAngle, selector]);
}
