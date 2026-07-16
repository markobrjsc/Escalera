import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// Inside Compose the backend is reachable as "server"; on the host it is localhost.
const serverUrl = process.env.SERVER_URL ?? "http://localhost:3000";
// The published port, when it differs from the one Vite binds, so the HMR socket
// dials an address the browser can actually reach.
const hmrClientPort = process.env.HMR_CLIENT_PORT ? Number(process.env.HMR_CLIENT_PORT) : undefined;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Escalera",
        short_name: "Escalera",
        description: "Das mobile Mehrspieler-Kartenspiel Escalera.",
        start_url: "/",
        scope: "/",
        display: "fullscreen",
        display_override: ["fullscreen", "standalone"],
        theme_color: "#17211d",
        background_color: "#17211d",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/api\//]
      }
    })
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    // Bind mounts do not forward filesystem events into a Linux container, so the
    // dev container has to poll to notice edits made on the host.
    watch: process.env.VITE_USE_POLLING ? { usePolling: true, interval: 300 } : undefined,
    hmr: hmrClientPort ? { clientPort: hmrClientPort } : undefined,
    proxy: {
      "/api": { target: serverUrl, changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, "") },
      "/socket.io": { target: serverUrl.replace(/^http/, "ws"), ws: true }
    }
  }
});
