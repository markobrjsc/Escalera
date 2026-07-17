import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { PileDesignView } from "./PileDesignView.js";
import { initMotionPreference } from "./fx.js";
import "./styles.css";

initMotionPreference();

// Design-Labor für die Stapel (#51): über Pfad oder Hash erreichbar, damit es
// auch hinter Hosts ohne SPA-Fallback funktioniert. Kein Login nötig.
const designRoute = window.location.pathname.replace(/\/+$/, "") === "/design/piles" || window.location.hash === "#/design/piles";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {designRoute ? <PileDesignView /> : <App />}
  </StrictMode>
);
