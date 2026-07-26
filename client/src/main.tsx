import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { DevApp } from "./dev/DevApp.js";
import { isDevPath } from "./dev/access.js";
import { initMotionPreference, usePrefersReducedMotion } from "./lib/motion.js";
import { AudioProvider } from "./audio.js";
import { ThreeExperience } from "./visual3d/ThreeExperience.js";
import { useSurfaceTilt } from "./visual3d/useSurfaceTilt.js";
import "./styles.css";

initMotionPreference();

// The admin-only component gallery and the legacy pile design lab (#51/#89) live
// under the dev router (path or hash, so they work behind hosts without an SPA
// fallback). Everything else is the game itself.
const dev = isDevPath(window.location.pathname, window.location.hash);

function SurfaceTiltController() {
  useSurfaceTilt();
  return null;
}

function DevExperience() {
  const reduced = usePrefersReducedMotion();
  return <><ThreeExperience scene="list" reducedMotion={reduced} /><DevApp /></>;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AudioProvider>
      <SurfaceTiltController />
      {dev ? <DevExperience /> : <App />}
    </AudioProvider>
  </StrictMode>
);
