import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import * as storage from "./storage/index.js";
import * as audioContext from "./audio/context.js";
import * as sounds from "./audio/sounds.js";
import * as recorder from "./audio/recorder.js";
import * as playback from "./audio/playback.js";
import * as tts from "./audio/tts.js";
import * as strokes from "./canvas/strokes.js";
import { playClickSound } from "./audio/sounds.js";

if (typeof window !== "undefined") {
  window.__storage = storage;
  window.__audio = {
    ...audioContext,
    ...sounds,
    ...recorder,
    ...playback,
    ...tts,
  };
  window.__canvas = strokes;
  window.addEventListener("pointerup", () => audioContext.primeAudio(), {
    once: true,
  });

  // A short click cue on every button tap, app-wide, via one delegated
  // listener rather than wiring onClick sound calls into every button in
  // every screen individually.
  document.addEventListener("click", (e) => {
    if (e.target.closest("button")) playClickSound();
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
