import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import * as storage from "./storage/index.js";
import * as audioContext from "./audio/context.js";
import * as sounds from "./audio/sounds.js";
import * as recorder from "./audio/recorder.js";
import * as strokes from "./canvas/strokes.js";

if (typeof window !== "undefined") {
  window.__storage = storage;
  window.__audio = { ...audioContext, ...sounds, ...recorder };
  window.__canvas = strokes;
  window.addEventListener("pointerup", () => audioContext.primeAudio(), {
    once: true,
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
