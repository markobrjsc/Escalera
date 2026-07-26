import * as THREE from "three";
import { readVisualCapabilities, resolveVisualQuality, type VisualQualityProfile } from "./quality.js";
import { normalizeVisualScene, VISUAL_SCENE_THEMES, type VisualScene } from "./themes.js";

export type ThreeSceneStatus = "ready" | "lost" | "fallback";

export type ThreeSceneController = {
  setReducedMotion: (reducedMotion: boolean) => void;
  setScene: (scene: VisualScene) => void;
  dispose: () => void;
};

type ThreeSceneOptions = {
  canvas: HTMLCanvasElement;
  context?: WebGL2RenderingContext;
  reducedMotion: boolean;
  scene: VisualScene;
  onStatus: (status: ThreeSceneStatus) => void;
};

type AmbientCard = THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhysicalMaterial> & {
  userData: {
    baseX: number;
    baseY: number;
    baseZ: number;
    baseRotationZ: number;
    phase: number;
    index: number;
  };
};

const MAX_CARDS = 10;
const MAX_PARTICLES = 72;

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

function disposeMaterial(material: THREE.Material) {
  for (const value of Object.values(material)) {
    if (value && typeof value === "object" && "isTexture" in value) {
      (value as THREE.Texture).dispose();
    }
  }
  material.dispose();
}

export function createThreeScene({
  canvas,
  context,
  reducedMotion: initialReducedMotion,
  scene: initialScene,
  onStatus
}: ThreeSceneOptions): ThreeSceneController {
  let disposed = false;
  let contextLost = false;
  let reducedMotion = initialReducedMotion;
  let activeScene = normalizeVisualScene(initialScene);
  let profile: VisualQualityProfile = resolveVisualQuality(readVisualCapabilities(reducedMotion));
  let frameRequest = 0;
  let resizeRequest = 0;
  let lastFrameAt = 0;
  let pointerX = 0;
  let pointerY = 0;
  let emergencyRenderer: THREE.WebGLRenderer | null = null;
  let emergencyWorld: THREE.Scene | null = null;

  try {
  const renderer = emergencyRenderer = new THREE.WebGLRenderer({
    canvas,
    context,
    alpha: true,
    antialias: profile.antialias,
    depth: true,
    stencil: false,
    powerPreference: profile.tier === "economy" ? "low-power" : "high-performance",
    preserveDrawingBuffer: false
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.84;
  renderer.setClearColor(0x07100d, 0);

  const world = emergencyWorld = new THREE.Scene();
  world.fog = new THREE.FogExp2(0x07100d, 0.052);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 36);
  camera.position.set(0, 0, 10.5);

  const ambient = new THREE.Group();
  ambient.rotation.x = -0.05;
  world.add(ambient);

  const theme = VISUAL_SCENE_THEMES[activeScene];
  const targetAccent = new THREE.Color(theme.accent);
  const targetSecondary = new THREE.Color(theme.secondary);
  let geometrySegments = profile.tier === "economy" ? 24 : profile.tier === "balanced" ? 40 : 64;
  const cardGeometry = new THREE.BoxGeometry(1.16, 1.66, 0.065, 2, 2, 1);
  const cards: AmbientCard[] = [];
  const cardMaterials: THREE.MeshPhysicalMaterial[] = [];

  for (let index = 0; index < MAX_CARDS; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const column = Math.floor(index / 2);
    const material = new THREE.MeshPhysicalMaterial({
      color: index % 3 === 0 ? theme.secondary : theme.accent,
      emissive: index % 3 === 0 ? theme.secondary : theme.accent,
      emissiveIntensity: 0.055,
      metalness: 0.16,
      roughness: 0.28,
      clearcoat: 0.72,
      clearcoatRoughness: 0.25,
      transparent: true,
      opacity: 0.22 + (MAX_CARDS - index) * 0.012
    });
    const card = new THREE.Mesh(cardGeometry, material) as AmbientCard;
    const baseX = side * (3.25 + column * 0.72);
    const baseY = 2.25 - column * 1.08 + (index % 3) * 0.1;
    const baseZ = -0.8 - column * 0.72;
    const baseRotationZ = side * (0.2 + column * 0.08);
    card.position.set(baseX, baseY, baseZ);
    card.rotation.set(-0.08 + column * 0.015, side * (-0.32 + column * 0.04), baseRotationZ);
    card.userData = {
      baseX,
      baseY,
      baseZ,
      baseRotationZ,
      phase: index * 0.81,
      index
    };
    cards.push(card);
    cardMaterials.push(material);
    ambient.add(card);
  }

  const tableMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x20312d,
    emissive: 0x52796f,
    emissiveIntensity: 0.025,
    metalness: 0.25,
    roughness: 0.55,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide
  });
  const table = new THREE.Mesh(new THREE.CircleGeometry(6.5, geometrySegments), tableMaterial);
  table.position.set(0, -3.05, -1.9);
  table.rotation.x = -1.25;
  ambient.add(table);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: theme.accent,
    transparent: true,
    opacity: 0.1,
    wireframe: true
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.15, 0.012, 4, geometrySegments * 2), ringMaterial);
  ring.position.z = -3.8;
  ring.rotation.x = 0.24;
  ambient.add(ring);

  const random = seededRandom(0xec5a1e);
  const particlePositions = new Float32Array(MAX_PARTICLES * 3);
  for (let index = 0; index < MAX_PARTICLES; index += 1) {
    const radius = 2.5 + random() * 7;
    const angle = random() * Math.PI * 2;
    particlePositions[index * 3] = Math.cos(angle) * radius;
    particlePositions[index * 3 + 1] = (random() - 0.5) * 8;
    particlePositions[index * 3 + 2] = -1.2 - random() * 8;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: theme.accent,
    size: 0.045,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  world.add(particles);

  world.add(new THREE.HemisphereLight(0x8cd6b3, 0x07100d, 0.72));
  const keyLight = new THREE.PointLight(theme.accent, 8.5, 22, 2);
  keyLight.position.set(-4, 4, 5);
  world.add(keyLight);
  const rimLight = new THREE.PointLight(theme.secondary, 5.5, 18, 2);
  rimLight.position.set(4, -2.5, 3);
  world.add(rimLight);

  function syncGeometryDetail(nextProfile: VisualQualityProfile) {
    const nextSegments =
      nextProfile.tier === "economy" ? 24 : nextProfile.tier === "balanced" ? 40 : 64;
    if (nextSegments === geometrySegments) return;
    table.geometry.dispose();
    table.geometry = new THREE.CircleGeometry(6.5, nextSegments);
    ring.geometry.dispose();
    ring.geometry = new THREE.TorusGeometry(4.15, 0.012, 4, nextSegments * 2);
    geometrySegments = nextSegments;
  }

  function resize() {
    if (disposed) return;
    const nextProfile = resolveVisualQuality(readVisualCapabilities(reducedMotion));
    syncGeometryDetail(nextProfile);
    profile = nextProfile;
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(profile.maxDpr);
    renderer.setSize(width, height, false);
    cards.forEach((card, index) => { card.visible = index < profile.cardCount; });
    particleGeometry.setDrawRange(0, profile.particleCount);
    canvas.dataset.quality = profile.tier;
  }

  function renderFrame(timeSeconds: number, snap = false) {
    const nextTheme = VISUAL_SCENE_THEMES[activeScene];
    targetAccent.set(nextTheme.accent);
    targetSecondary.set(nextTheme.secondary);
    const blend = snap ? 1 : 0.035;
    ringMaterial.color.lerp(targetAccent, blend);
    particleMaterial.color.lerp(targetAccent, blend);
    keyLight.color.lerp(targetAccent, blend);
    rimLight.color.lerp(targetSecondary, blend);

    const motion = reducedMotion ? 0 : 1;
    const energy = nextTheme.energy;
    const cameraTargetX = nextTheme.cameraX + pointerX * 0.2 * motion;
    const cameraTargetY = nextTheme.cameraY - pointerY * 0.12 * motion;
    camera.position.x += (cameraTargetX - camera.position.x) * (snap ? 1 : 0.035);
    camera.position.y += (cameraTargetY - camera.position.y) * (snap ? 1 : 0.035);
    camera.lookAt(0, -0.05, -1.2);

    ambient.rotation.y = motion * Math.sin(timeSeconds * 0.075) * 0.035 * energy;
    ambient.rotation.z = motion * Math.sin(timeSeconds * 0.11) * 0.012 * energy;
    particles.rotation.z = motion * timeSeconds * 0.007 * energy;
    ring.rotation.z = motion * timeSeconds * -0.018 * energy;

    cards.forEach((card, index) => {
      const cardTheme = index % 3 === 0 ? targetSecondary : targetAccent;
      card.material.color.lerp(cardTheme, blend);
      card.material.emissive.lerp(cardTheme, blend);
      const wave = Math.sin(timeSeconds * (0.22 + energy * 0.08) + card.userData.phase);
      card.position.x = card.userData.baseX + wave * 0.05 * motion;
      card.position.y = card.userData.baseY + wave * 0.11 * energy * motion;
      card.position.z = card.userData.baseZ + Math.cos(timeSeconds * 0.19 + card.userData.phase) * 0.08 * motion;
      card.rotation.z = card.userData.baseRotationZ +
        motion * timeSeconds * (index % 2 ? -1 : 1) * 0.036 * energy;
    });

    renderer.render(world, camera);
  }

  function stop() {
    if (!frameRequest) return;
    window.cancelAnimationFrame(frameRequest);
    frameRequest = 0;
  }

  function cancelScheduledResize() {
    if (!resizeRequest) return;
    window.cancelAnimationFrame(resizeRequest);
    resizeRequest = 0;
  }

  function tick(now: number) {
    frameRequest = 0;
    if (disposed || contextLost || document.hidden || reducedMotion || activeScene !== "game") return;
    const frameInterval = 1000 / Math.max(1, profile.maxFps);
    if (!lastFrameAt || now - lastFrameAt >= frameInterval - 1) {
      lastFrameAt = now;
      renderFrame(now / 1000);
    }
    frameRequest = window.requestAnimationFrame(tick);
  }

  function start() {
    if (disposed || contextLost || document.hidden || reducedMotion || activeScene !== "game" || frameRequest) return;
    lastFrameAt = 0;
    frameRequest = window.requestAnimationFrame(tick);
  }

  function renderStaticFrame() {
    if (disposed || contextLost || document.hidden) return;
    renderFrame(0, true);
  }

  function scheduleStaticFrame() {
    if (disposed || contextLost || document.hidden || frameRequest) return;
    frameRequest = window.requestAnimationFrame(() => {
      frameRequest = 0;
      if (disposed || contextLost || document.hidden) return;
      if (activeScene === "game") start();
      else renderFrame(0, true);
    });
  }

  function scheduleResize() {
    if (disposed || contextLost || document.hidden || resizeRequest) return;
    resizeRequest = window.requestAnimationFrame(() => {
      resizeRequest = 0;
      if (disposed || contextLost || document.hidden) return;
      resize();
      if (reducedMotion || activeScene !== "game") renderStaticFrame();
    });
  }

  function handleVisibility() {
    if (document.hidden) {
      stop();
      cancelScheduledResize();
      return;
    }
    resize();
    if (reducedMotion || activeScene !== "game") renderStaticFrame();
    else start();
  }

  function handlePointer(event: PointerEvent) {
    if (reducedMotion || profile.tier === "economy") return;
    pointerX = event.clientX / Math.max(1, window.innerWidth) * 2 - 1;
    pointerY = event.clientY / Math.max(1, window.innerHeight) * 2 - 1;
    if (activeScene !== "game") scheduleStaticFrame();
  }

  function resetPointer() {
    pointerX = 0;
    pointerY = 0;
    if (activeScene !== "game") scheduleStaticFrame();
  }

  function handleContextLost(event: Event) {
    event.preventDefault();
    contextLost = true;
    stop();
    cancelScheduledResize();
    onStatus("lost");
  }

  function handleContextRestored() {
    if (disposed) return;
    try {
      contextLost = false;
      renderer.resetState();
      resize();
      renderStaticFrame();
      onStatus("ready");
      start();
    } catch {
      contextLost = true;
      stop();
      onStatus("fallback");
      disposed = true;
      releaseResources();
    }
  }

  const viewport = window.visualViewport;
  window.addEventListener("resize", scheduleResize, { passive: true });
  viewport?.addEventListener("resize", scheduleResize, { passive: true });
  window.addEventListener("pointermove", handlePointer, { passive: true });
  window.addEventListener("pointerleave", resetPointer, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  canvas.addEventListener("webglcontextlost", handleContextLost);
  canvas.addEventListener("webglcontextrestored", handleContextRestored);

  function releaseResources() {
    stop();
    cancelScheduledResize();
    window.removeEventListener("resize", scheduleResize);
    viewport?.removeEventListener("resize", scheduleResize);
    window.removeEventListener("pointermove", handlePointer);
    window.removeEventListener("pointerleave", resetPointer);
    document.removeEventListener("visibilitychange", handleVisibility);
    canvas.removeEventListener("webglcontextlost", handleContextLost);
    canvas.removeEventListener("webglcontextrestored", handleContextRestored);

    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    world.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach(disposeMaterial);
    renderer.dispose();
    renderer.forceContextLoss();
    world.clear();
    emergencyRenderer = null;
    emergencyWorld = null;
  }

  try {
    resize();
    renderStaticFrame();
    onStatus("ready");
    start();
  } catch (error) {
    onStatus("fallback");
    disposed = true;
    releaseResources();
    throw error;
  }

  return {
    setReducedMotion(nextReducedMotion) {
      if (disposed || reducedMotion === nextReducedMotion) return;
      reducedMotion = nextReducedMotion;
      resize();
      if (reducedMotion) {
        stop();
        resetPointer();
        renderStaticFrame();
      } else if (activeScene === "game") {
        start();
      } else {
        renderStaticFrame();
      }
    },
    setScene(nextScene) {
      if (disposed) return;
      activeScene = normalizeVisualScene(nextScene);
      if (reducedMotion || activeScene !== "game") {
        stop();
        renderStaticFrame();
      } else start();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      releaseResources();
    }
  };
  } catch (error) {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    emergencyWorld?.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.Line) {
        geometries.add(object.geometry);
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach((material) => materials.add(material));
      }
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach(disposeMaterial);
    emergencyRenderer?.dispose();
    emergencyRenderer?.forceContextLoss();
    emergencyWorld?.clear();
    throw error;
  }
}
