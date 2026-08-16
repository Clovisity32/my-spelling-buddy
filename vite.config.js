import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages serves a project site from a subpath (/my-spelling-buddy/),
// not the root — only the GH Pages build (npm run build:gh-pages) opts into
// that base, so local dev, npm run build, and the whole Playwright suite
// (which navigate to "/") are unaffected.
const base = process.env.GH_PAGES === "true" ? "/my-spelling-buddy/" : "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "My Spelling Buddy",
        short_name: "SpellingBuddy",
        description: "A spelling practice buddy",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f0f9ff",
        theme_color: "#38bdf8",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: { port: 5173 },
  preview: { port: 4173 },
});
