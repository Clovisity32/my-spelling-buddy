import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import * as storage from "./storage/index.js";

// Test-only hook: lets Playwright drive persistence directly via
// page.evaluate without a UI round-trip for every fixture. Harmless to ship
// — this is an offline, local-only kids app with no sensitive data reachable
// through it.
if (typeof window !== "undefined") {
  window.__storage = storage;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
