import { useEffect, useRef, useState } from "react";
import {
  detachContextLease,
  forceReleaseContextLease,
  leaseContext,
  releaseClassWhenUnused,
  releaseContextLease,
  type ContextLeaseState
} from "./contextLease.js";
import { readVisualCapabilities, resolveVisualQuality } from "./quality.js";
import { normalizeVisualScene, type VisualScene } from "./themes.js";
import { acquireWebGL2Context, releaseWebGLContext } from "./webgl.js";
import type { ThreeSceneController, ThreeSceneStatus } from "./createThreeScene.js";
import "./ThreeExperience.css";

type ThreeExperienceProps = {
  scene: VisualScene;
  reducedMotion?: boolean;
};

type ExperienceStatus = "idle" | "loading" | ThreeSceneStatus;

function systemPrefersReducedMotion() {
  return typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function dataSaverActive(
  browserNavigator: (Navigator & { connection?: { saveData?: boolean } }) | undefined =
    typeof navigator === "undefined" ? undefined : navigator
) {
  return Boolean(browserNavigator?.connection?.saveData);
}

export function ThreeExperience({ scene, reducedMotion }: ThreeExperienceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controllerRef = useRef<ThreeSceneController | null>(null);
  const contextLeaseRef = useRef<ContextLeaseState<WebGL2RenderingContext>>({ current: null, owners: 0 });
  const sceneRef = useRef(normalizeVisualScene(scene));
  const reducedMotionRef = useRef(reducedMotion ?? systemPrefersReducedMotion());
  const [status, setStatus] = useState<ExperienceStatus>("idle");
  const normalizedScene = normalizeVisualScene(scene);
  const motionReduced = reducedMotion ?? systemPrefersReducedMotion();
  sceneRef.current = normalizedScene;
  reducedMotionRef.current = motionReduced;

  useEffect(() => {
    let active = true;
    const canvas = canvasRef.current;
    const root = canvas?.closest("#root");
    const releaseRootClass = () =>
      releaseClassWhenUnused(root, "visual3d-root", ".three-experience");
    root?.classList.add("visual3d-root");
    if (!canvas || dataSaverActive()) {
      setStatus("fallback");
      return releaseRootClass;
    }

    const profile = resolveVisualQuality(readVisualCapabilities(reducedMotionRef.current));
    const context = leaseContext(contextLeaseRef.current, () => acquireWebGL2Context(canvas, {
        alpha: true,
        antialias: profile.antialias,
        depth: true,
        stencil: false,
        powerPreference: profile.tier === "economy" ? "low-power" : "high-performance"
      }) as WebGL2RenderingContext | null);
    if (!context) {
      setStatus("fallback");
      return releaseRootClass;
    }
    let ownedController: ThreeSceneController | null = null;

    setStatus("loading");
    void import("./createThreeScene.js")
      .then(({ createThreeScene }) => {
        if (!active) return;
        const controller = createThreeScene({
          canvas,
          context,
          scene: sceneRef.current,
          reducedMotion: reducedMotionRef.current,
          onStatus: (nextStatus) => { if (active) setStatus(nextStatus); }
        });
        ownedController = controller;
        controllerRef.current = controller;
      })
      .catch(() => {
        if (active) {
          forceReleaseContextLease(contextLeaseRef.current, context, releaseWebGLContext);
        }
        if (!active) return;
        controllerRef.current = null;
        setStatus("fallback");
      });

    return () => {
      active = false;
      if (ownedController) {
        detachContextLease(contextLeaseRef.current, context);
        ownedController.dispose();
        if (controllerRef.current === ownedController) controllerRef.current = null;
      } else {
        releaseContextLease(contextLeaseRef.current, context, releaseWebGLContext);
      }
      releaseRootClass();
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setScene(normalizeVisualScene(scene));
  }, [scene]);

  useEffect(() => {
    if (reducedMotion !== undefined) {
      reducedMotionRef.current = reducedMotion;
      controllerRef.current?.setReducedMotion(reducedMotion);
      return;
    }
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      reducedMotionRef.current = query.matches;
      controllerRef.current?.setReducedMotion(query.matches);
    };
    apply();
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", apply);
      return () => query.removeEventListener("change", apply);
    }
    query.addListener?.(apply);
    return () => query.removeListener?.(apply);
  }, [reducedMotion]);

  return (
    <div
      aria-hidden="true"
      className="three-experience"
      data-motion={motionReduced ? "reduced" : "full"}
      data-scene={normalizedScene}
      data-state={status}
    >
      <canvas className="three-experience__canvas" ref={canvasRef} tabIndex={-1} />
    </div>
  );
}
