import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "My Spelling Buddy",
        short_name: "SpellingBuddy",
        description: "Chloe's spelling practice buddy",
        start_url: "/",
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
