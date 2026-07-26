import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { DevApp } from "./dev/DevApp.js";
import { isDevPath } from "./dev/access.js";
import { initMotionPreference } from "./lib/motion.js";
import { AudioProvider } from "./audio.js";
import "./styles.css";

initMotionPreference();

// The admin-only component gallery and the legacy pile design lab (#51/#89) live
// under the dev router (path or hash, so they work behind hosts without an SPA
// fallback). Everything else is the game itself.
const dev = isDevPath(window.location.pathname, window.location.hash);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AudioProvider>{dev ? <DevApp /> : <App />}</AudioProvider>
  </StrictMode>
);
