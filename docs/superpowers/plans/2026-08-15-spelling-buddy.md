# My Spelling Buddy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first PWA where Chloe (7) hears a parent-recorded word, writes it on an iPad canvas, and saves it — with no right/wrong feedback during practice — while her parents record words, review her handwriting, and mark it later.

**Architecture:** Vite + React 18 + Tailwind 3 single-page app, no backend. All persistence goes through one storage module backed by IndexedDB (Blobs for audio). Navigation is in-memory screen state in `App.jsx` (no router). The whiteboard is a hand-rolled Canvas 2D component porting the iPad-specific pointer-handling fixes from a sibling project; recording uses `MediaRecorder`; feedback sounds are synthesized via Web Audio, never audio files.

**Tech Stack:** Vite 5, React 18, Tailwind 3, `@playwright/test`, `vite-plugin-pwa`. No drawing library, no router, no backend, no state-management library.

**Spec:** `docs/superpowers/specs/2026-08-15-spelling-buddy-design.md`

## Global Constraints

- No word or phrase implying right/wrong/scoring — "wrong", "incorrect", "failed", "score", "%" — ever renders on a screen Chloe can reach (Home, the practice-mode Lists screen, Test, Celebration). Task 9 includes a test asserting this by scanning rendered text.
- Whiteboard logical coordinate space is fixed at `CANVAS_W = 1000`, `CANVAS_H = 500` (see spec's ported-logic section) — every file that paints strokes imports these from `src/canvas/strokes.js`, never redeclares them.
- Canvas input is Pointer Events only, `touchAction: "none"` on the `<canvas>`, with palm rejection (a touch pointer is dropped while a pen pointer is tracked) and 800ms stale-pointer pruning — both ported from My Lesson Buddy's `WhiteboardCanvas.jsx` per the spec.
- All persistence goes through `src/storage/index.js`. No screen or component imports `src/storage/idb.js` directly. Audio is stored as a `Blob` with its actual mime type recorded alongside it (never hardcode `audio/webm` — iOS records `audio/mp4`).
- No router library. Navigation is `App.jsx` state (`screen`, `params`) passed down as an `onNavigate(screen, params)` callback.
- No drawing library (Fabric/Konva/etc.) — Canvas 2D only.
- Reordering words in the list editor uses up/down buttons, not drag-and-drop (a deliberate spec divergence — reliable and Playwright-testable for a short list; see spec's Out of Scope section).
- Test hooks: `src/main.jsx` attaches `window.__storage` (Task 2), `window.__audio` (Task 3, merging context+sounds+recorder exports), `window.__canvas` (Task 4, the `strokes.js` exports) at module load. These are intentional, harmless test seams for an offline local-only kids app — every task that adds one shows the complete resulting `main.jsx`.
- Testing approach: Playwright integration tests against a production build (`npm run build` then the `preview` server), per the project's standing testing convention. Most tasks are verified this way rather than through per-function unit tests — this is a UI-heavy app where the meaningful behavior is at the integration level.
- Every task's Playwright spec file must pass via `npx playwright test <file>` before that task's commit.

---

### Task 1: Project scaffold

**Files:**

- Create: `package.json`, `vite.config.js`, `tailwind.config.js`, `postcss.config.js`, `index.html`, `.gitignore`
- Create: `src/main.jsx`, `src/App.jsx`, `src/index.css`
- Create: `playwright.config.js`
- Test: `tests/smoke.spec.js`

**Interfaces:**

- Produces: `App` default export (a component with no props yet) that later tasks extend; the `screen`/`params`/`navigate()` state pattern that every later screen task plugs into.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "my-spelling-buddy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview --port 4173",
    "test": "playwright test"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@playwright/test": "^1.49.1",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^5.4.11",
    "vite-plugin-pwa": "^0.21.1"
  }
}
```

- [ ] **Step 2: Write `vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  preview: { port: 4173 },
});
```

- [ ] **Step 3: Write `tailwind.config.js` and `postcss.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
};
```

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
};
```

- [ ] **Step 4: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <title>My Spelling Buddy</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 6: Write `src/App.jsx`**

```jsx
import { useState } from "react";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});

  function navigate(next, nextParams = {}) {
    setScreen(next);
    setParams(nextParams);
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800">
      {screen === "home" && (
        <div className="flex min-h-screen items-center justify-center">
          <h1 className="text-4xl font-bold">My Spelling Buddy</h1>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Write `src/main.jsx`**

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: Write `.gitignore`**

```
node_modules
dist
dev-dist
.superpowers
test-results
playwright-report
```

- [ ] **Step 9: Write `playwright.config.js`**

```js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  webServer: {
    command: "npm run build && npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  use: {
    baseURL: "http://localhost:4173",
  },
});
```

- [ ] **Step 10: Write `tests/smoke.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("home screen renders the app title", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "My Spelling Buddy" }),
  ).toBeVisible();
});
```

- [ ] **Step 11: Install and run**

```bash
npm install
npx playwright install chromium
npx playwright test tests/smoke.spec.js
```

Expected: 1 passed.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite/React/Tailwind project with Playwright"
```

---

### Task 2: Storage layer (IndexedDB)

**Files:**

- Create: `src/storage/idb.js`, `src/storage/index.js`
- Modify: `src/main.jsx`
- Test: `tests/storage.spec.js`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces (used by every later screen task): `createList(name)`, `getLists()`, `getList(listId)`, `renameList(listId, name)`, `addWord(listId, {text, audioBlob, audioMime})`, `updateWord(wordId, fields)`, `deleteWord(listId, wordId)`, `reorderWords(listId, wordIds)`, `getWords(listId)`, `putAttempt(listId, wordId, strokes)`, `getAttempt(listId, wordId)`, `setMark(listId, wordId, ticked)`, `getMarksForList(listId)` — all `async`, all exported from `src/storage/index.js`.

- [ ] **Step 1: Write `src/storage/idb.js`**

```js
// Thin promise wrapper over the raw IndexedDB API. No `idb` dependency —
// four stores and five operations don't need one.
const DB_NAME = "spelling-buddy";
const DB_VERSION = 1;

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("lists")) {
        db.createObjectStore("lists", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("words")) {
        const words = db.createObjectStore("words", { keyPath: "id" });
        words.createIndex("listId", "listId", { unique: false });
      }
      if (!db.objectStoreNames.contains("attempts")) {
        db.createObjectStore("attempts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("marks")) {
        db.createObjectStore("marks", { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  return reqToPromise(tx.objectStore(storeName).get(key));
}

export async function getAll(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  return reqToPromise(tx.objectStore(storeName).getAll());
}

export async function getAllByIndex(storeName, indexName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  return reqToPromise(tx.objectStore(storeName).index(indexName).getAll(value));
}

export async function put(storeName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export async function del(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

- [ ] **Step 2: Write `src/storage/index.js`**

```js
// The only storage API the rest of the app is allowed to import. Every
// screen goes through here, never through idb.js directly — swapping in a
// network-backed adapter later means writing one new file against this same
// async interface and changing one import, not touching any screen.
import * as idb from "./idb.js";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createList(name) {
  const list = { id: uid(), name, createdAt: Date.now(), wordOrder: [] };
  await idb.put("lists", list);
  return list;
}

export async function getLists() {
  const lists = await idb.getAll("lists");
  return lists.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getList(listId) {
  return idb.get("lists", listId);
}

export async function renameList(listId, name) {
  const list = await idb.get("lists", listId);
  if (!list) return;
  await idb.put("lists", { ...list, name });
}

export async function addWord(listId, { text, audioBlob, audioMime }) {
  const word = {
    id: uid(),
    listId,
    text,
    audioBlob,
    audioMime,
    createdAt: Date.now(),
  };
  await idb.put("words", word);
  const list = await idb.get("lists", listId);
  await idb.put("lists", { ...list, wordOrder: [...list.wordOrder, word.id] });
  return word;
}

export async function updateWord(wordId, fields) {
  const words = await idb.getAll("words");
  const word = words.find((w) => w.id === wordId);
  if (!word) return;
  await idb.put("words", { ...word, ...fields });
}

export async function deleteWord(listId, wordId) {
  await idb.del("words", wordId);
  const list = await idb.get("lists", listId);
  if (!list) return;
  await idb.put("lists", {
    ...list,
    wordOrder: list.wordOrder.filter((id) => id !== wordId),
  });
}

export async function reorderWords(listId, wordIds) {
  const list = await idb.get("lists", listId);
  if (!list) return;
  await idb.put("lists", { ...list, wordOrder: wordIds });
}

export async function getWords(listId) {
  const words = await idb.getAllByIndex("words", "listId", listId);
  const list = await idb.get("lists", listId);
  const order = list?.wordOrder || [];
  const byId = new Map(words.map((w) => [w.id, w]));
  return order.map((id) => byId.get(id)).filter(Boolean);
}

export async function putAttempt(listId, wordId, strokes) {
  await idb.put("attempts", {
    id: `${listId}:${wordId}`,
    strokes,
    updatedAt: Date.now(),
  });
}

export async function getAttempt(listId, wordId) {
  const row = await idb.get("attempts", `${listId}:${wordId}`);
  return row ? row.strokes : null;
}

export async function setMark(listId, wordId, ticked) {
  await idb.put("marks", {
    id: `${listId}:${wordId}`,
    ticked,
    markedAt: Date.now(),
  });
}

export async function getMarksForList(listId) {
  const words = await getWords(listId);
  const marks = {};
  for (const w of words) {
    const row = await idb.get("marks", `${listId}:${w.id}`);
    marks[w.id] = row ? row.ticked : false;
  }
  return marks;
}
```

- [ ] **Step 3: Overwrite `src/main.jsx` with the full new content**

```jsx
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
```

- [ ] **Step 4: Write `tests/storage.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("a word with its audio blob survives a reload", async ({ page }) => {
  await page.goto("/");
  const { listId, wordId } = await page.evaluate(async () => {
    const list = await window.__storage.createList("Week 1");
    const blob = new Blob(["fake-audio-bytes"], { type: "audio/webm" });
    const word = await window.__storage.addWord(list.id, {
      text: "apple",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    return { listId: list.id, wordId: word.id };
  });

  await page.reload();

  const result = await page.evaluate(
    async ({ listId, wordId }) => {
      const words = await window.__storage.getWords(listId);
      const word = words.find((w) => w.id === wordId);
      return {
        text: word?.text,
        mime: word?.audioMime,
        blobSize: word?.audioBlob?.size,
        isBlob: word?.audioBlob instanceof Blob,
      };
    },
    { listId, wordId },
  );

  expect(result.text).toBe("apple");
  expect(result.mime).toBe("audio/webm");
  expect(result.isBlob).toBe(true);
  expect(result.blobSize).toBeGreaterThan(0);
});

test("reorderWords and deleteWord update word order", async ({ page }) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("Week 2");
    const a = await window.__storage.addWord(list.id, {
      text: "a",
      audioBlob: null,
      audioMime: null,
    });
    const b = await window.__storage.addWord(list.id, {
      text: "b",
      audioBlob: null,
      audioMime: null,
    });
    await window.__storage.reorderWords(list.id, [b.id, a.id]);
    const reordered = await window.__storage.getWords(list.id);
    await window.__storage.deleteWord(list.id, a.id);
    const afterDelete = await window.__storage.getWords(list.id);
    return {
      reorderedTexts: reordered.map((w) => w.text),
      afterDeleteTexts: afterDelete.map((w) => w.text),
    };
  });
  expect(out.reorderedTexts).toEqual(["b", "a"]);
  expect(out.afterDeleteTexts).toEqual(["b"]);
});

test("marks persist per list/word", async ({ page }) => {
  await page.goto("/");
  const marks = await page.evaluate(async () => {
    const list = await window.__storage.createList("Week 3");
    const w = await window.__storage.addWord(list.id, {
      text: "x",
      audioBlob: null,
      audioMime: null,
    });
    await window.__storage.setMark(list.id, w.id, true);
    return window.__storage.getMarksForList(list.id);
  });
  expect(Object.values(marks)[0]).toBe(true);
});
```

- [ ] **Step 5: Run and verify**

```bash
npx playwright test tests/storage.spec.js
```

Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add IndexedDB storage layer behind a single async API"
```

---

### Task 3: Audio — context, synthesized sounds, recorder

**Files:**

- Create: `src/audio/context.js`, `src/audio/sounds.js`, `src/audio/recorder.js`
- Modify: `src/main.jsx`
- Test: `tests/audio.spec.js`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces (used by Task 8's ListEditor, Task 9's Test/Celebration, Task 10's Review): `getAudioContext()`, `ensureAudioContextRunning()`, `primeAudio()` from `context.js`; `playSaveChime()`, `playFanfare()`, `playHappyTick()` from `sounds.js`; `isRecordingSupported()`, `startRecording()` returning `{ stop(): Promise<{blob, mime}>, cancel() }` from `recorder.js`. All merged onto `window.__audio`.

- [ ] **Step 1: Write `src/audio/context.js`**

```js
// Shared Web Audio singleton, ported from My Lesson Buddy's client/src/audio.js
// (see docs/superpowers/specs/2026-08-15-spelling-buddy-design.md). Reused
// across every synthesized sound instead of one `new AudioContext()` per
// call — Safari caps concurrent unclosed contexts at a low single-digit
// number, and past that cap the constructor throws for the rest of the
// page's life.
let sharedAudioCtx = null;

export function getAudioContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume().catch(() => {
      console.warn(
        "[audio] AudioContext.resume() rejected — audio may stay silent",
      );
    });
  }
  return sharedAudioCtx;
}

// Chrome on iOS can drop audio scheduled before its resume() promise
// settles, even mid-session — Safari tends to tolerate that race. Every
// sound goes through this (which awaits) instead of calling
// getAudioContext() directly and scheduling immediately.
export async function ensureAudioContextRunning() {
  const ctx = getAudioContext();
  if (!ctx) return null;
  if (ctx.state === "running") return ctx;
  try {
    await ctx.resume();
  } catch {
    /* handled by the running-state check below */
  }
  return ctx.state === "running" ? ctx : null;
}

// A ~0.1s silent WAV, base64-encoded — a second, independent unlock path
// alongside the AudioContext buffer trick. Chrome on iOS gates <audio>/
// <video> playback separately from AudioContext state, so the classic
// Safari-era AudioContext-only unlock isn't enough on its own.
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
let unlockAudioEl = null;

// Call synchronously from inside a raw onClick/onPointerDown handler (a
// genuine user-activation call stack) to unlock the shared context for the
// rest of the page's life.
export function primeAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch {
    /* no AudioContext available */
  }
  try {
    if (!unlockAudioEl) unlockAudioEl = new Audio(SILENT_WAV);
    const playPromise = unlockAudioEl.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(() => unlockAudioEl.pause()).catch(() => {});
    } else {
      unlockAudioEl.pause();
    }
  } catch {
    /* no <audio> element available */
  }
}
```

- [ ] **Step 2: Write `src/audio/sounds.js`**

```js
// Synthesized feedback sounds — no audio files to ship, host, or fail to
// load. Every sound goes through ensureAudioContextRunning() rather than
// getAudioContext() directly, so a sound scheduled right after the unlock
// gesture isn't silently dropped on Chrome/iOS.
import { ensureAudioContextRunning } from "./context.js";

function tone(ctx, { freq, start, duration, type = "sine", gain = 0.2 }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export async function playSaveChime() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, { freq: 660, start: now, duration: 0.12 });
  tone(ctx, { freq: 880, start: now + 0.1, duration: 0.16 });
}

export async function playFanfare() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  const now = ctx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
    tone(ctx, { freq, start: now + i * 0.14, duration: 0.3, gain: 0.25 });
  });
}

export async function playHappyTick() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, { freq: 784, start: now, duration: 0.1, type: "triangle" });
  tone(ctx, {
    freq: 1046.5,
    start: now + 0.08,
    duration: 0.2,
    type: "triangle",
  });
}
```

- [ ] **Step 3: Write `src/audio/recorder.js`**

```js
// MediaRecorder wrapper. iOS Safari records audio/mp4, not audio/webm — the
// candidate list is tried in order via isTypeSupported() and the mime that
// actually won is stored alongside the blob (storage/index.js's audioMime
// field), because hardcoding webm would silently produce a file iOS
// couldn't have recorded or other browsers couldn't necessarily play back.
const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

export function isRecordingSupported() {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined"
  );
}

function pickMimeType() {
  for (const candidate of MIME_CANDIDATES) {
    if (window.MediaRecorder.isTypeSupported(candidate)) return candidate;
  }
  return "";
}

export async function startRecording() {
  if (!isRecordingSupported()) {
    throw new Error("Recording is not supported on this device.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new window.MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined,
  );
  const chunks = [];
  recorder.addEventListener("dataavailable", (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  function stopTracks() {
    stream.getTracks().forEach((t) => t.stop());
  }

  recorder.start();

  return {
    stop() {
      return new Promise((resolve) => {
        recorder.addEventListener(
          "stop",
          () => {
            const blob = new Blob(chunks, {
              type: recorder.mimeType || mimeType || "audio/webm",
            });
            stopTracks();
            resolve({ blob, mime: blob.type });
          },
          { once: true },
        );
        recorder.stop();
      });
    },
    cancel() {
      if (recorder.state !== "inactive") recorder.stop();
      stopTracks();
    },
  };
}
```

- [ ] **Step 4: Overwrite `src/main.jsx` with the full new content**

```jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import * as storage from "./storage/index.js";
import * as audioContext from "./audio/context.js";
import * as sounds from "./audio/sounds.js";
import * as recorder from "./audio/recorder.js";

// Test-only hooks — see Task 2's storage.spec.js comment for the rationale;
// same reasoning applies to audio.
if (typeof window !== "undefined") {
  window.__storage = storage;
  window.__audio = { ...audioContext, ...sounds, ...recorder };
  window.addEventListener("pointerdown", () => audioContext.primeAudio(), {
    once: true,
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 5: Write `tests/audio.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("synthesized sounds play without throwing", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").click(); // user gesture, unlocks AudioContext
  const errors = await page.evaluate(async () => {
    const errs = [];
    for (const [name, fn] of [
      ["chime", window.__audio.playSaveChime],
      ["fanfare", window.__audio.playFanfare],
      ["tick", window.__audio.playHappyTick],
    ]) {
      try {
        await fn();
      } catch (e) {
        errs.push(`${name}: ${e.message}`);
      }
    }
    return errs;
  });
  expect(errors).toEqual([]);
});

test("recorder captures a blob from a mocked microphone", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeTrack {
      stop() {}
    }
    class FakeStream {
      getTracks() {
        return [new FakeTrack()];
      }
    }
    class FakeMediaRecorder {
      constructor(stream, opts) {
        this.mimeType = (opts && opts.mimeType) || "audio/webm";
        this.state = "inactive";
        this.listeners = {};
      }
      static isTypeSupported(type) {
        return type.startsWith("audio/webm");
      }
      addEventListener(evt, cb) {
        (this.listeners[evt] ||= []).push(cb);
      }
      start() {
        this.state = "recording";
        (this.listeners.dataavailable || []).forEach((cb) =>
          cb({ data: new Blob(["chunk"], { type: this.mimeType }) }),
        );
      }
      stop() {
        this.state = "inactive";
        (this.listeners.stop || []).forEach((cb) => cb());
      }
    }
    window.MediaRecorder = FakeMediaRecorder;
    navigator.mediaDevices = { getUserMedia: async () => new FakeStream() };
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const handle = await window.__audio.startRecording();
    const { blob, mime } = await handle.stop();
    return { size: blob.size, mime, isBlob: blob instanceof Blob };
  });
  expect(result.isBlob).toBe(true);
  expect(result.size).toBeGreaterThan(0);
  expect(result.mime).toContain("audio/webm");
});
```

- [ ] **Step 6: Run and verify**

```bash
npx playwright test tests/audio.spec.js
```

Expected: 2 passed.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Web Audio unlock singleton, synthesized sounds, and recorder"
```

---

### Task 4: Canvas stroke utilities

**Files:**

- Create: `src/canvas/strokes.js`
- Modify: `src/main.jsx`
- Test: `tests/strokes.spec.js`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces (used by Task 5's Whiteboard and Task 6's StrokeReplay): `CANVAS_W`, `CANVAS_H`, `PEN_SIZES`, `ERASER_SIZES`, `COLORS`, `DECIMATE_MIN_DIST`, `uid()`, `paintStroke(ctx, stroke, scale)`, `redrawAll(ctx, canvas, strokes, scale)`.

- [ ] **Step 1: Write `src/canvas/strokes.js`**

```js
// Pure stroke-painting functions shared by the interactive Whiteboard and
// the read-only StrokeReplay, so a saved attempt renders identically in
// both. A stroke is a flat int-pair array in a fixed logical coordinate
// space — ported approach from My Lesson Buddy's WhiteboardCanvas.jsx, see
// docs/superpowers/specs/2026-08-15-spelling-buddy-design.md. Zoom/pan and
// board-image compositing are deliberately not ported (unneeded here),
// which is why this file needs no offscreen scratch canvas: a plain
// destination-out stroke painted directly, after the white fill, is enough.
export const CANVAS_W = 1000;
export const CANVAS_H = 500;
export const PEN_SIZES = { fine: 3, medium: 6, thick: 10 };
export const ERASER_SIZES = { small: 20, medium: 32, large: 48 };
export const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#059669", "#7c3aed"];
export const DECIMATE_MIN_DIST = 3;

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function paintStroke(ctx, stroke, scale) {
  const pts = stroke.points;
  if (pts.length < 2) return;
  const erasing = stroke.tool === "eraser";
  ctx.save();
  if (erasing) {
    // Paints opaque white rather than using destination-out: redrawAll
    // always fills this flat canvas white and replays every stroke on top
    // of it (no separate ink layer over a background image, which is what
    // destination-out protects), so punching an alpha hole here would cut
    // through the white fill itself and leave a transparent pixel instead
    // of a white one.
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
  }
  ctx.lineWidth = stroke.width * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (pts.length === 2) {
    // A tap with no drag — draw a dot so it's still visible.
    ctx.beginPath();
    ctx.arc(
      pts[0] * scale,
      pts[1] * scale,
      (stroke.width * scale) / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0] * scale, pts[1] * scale);
  for (let i = 2; i < pts.length; i += 2)
    ctx.lineTo(pts[i] * scale, pts[i + 1] * scale);
  ctx.stroke();
  ctx.restore();
}

export function redrawAll(ctx, canvas, strokes, scale) {
  // Clear in untransformed device pixels regardless of whatever transform
  // (dpr scaling) the caller has set, then restore it for the fill/strokes
  // below, which are painted in the caller's coordinate convention
  // (logical-unit coordinates times `scale`).
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W * scale, CANVAS_H * scale);
  for (const stroke of strokes) paintStroke(ctx, stroke, scale);
}
```

- [ ] **Step 2: Overwrite `src/main.jsx` with the full new content**

```jsx
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
  window.addEventListener("pointerdown", () => audioContext.primeAudio(), {
    once: true,
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Write `tests/strokes.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("paintStroke draws a line and destination-out erases it back to white", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    window.__canvas.redrawAll(ctx, canvas, [], 1);
    const before = Array.from(ctx.getImageData(50, 50, 1, 1).data);

    const penStroke = {
      id: "s1",
      tool: "pen",
      color: "#1f2937",
      width: 10,
      points: [10, 50, 90, 50],
    };
    window.__canvas.redrawAll(ctx, canvas, [penStroke], 1);
    const afterPen = Array.from(ctx.getImageData(50, 50, 1, 1).data);

    const eraserStroke = {
      id: "s2",
      tool: "eraser",
      color: "#ffffff",
      width: 20,
      points: [10, 50, 90, 50],
    };
    window.__canvas.redrawAll(ctx, canvas, [penStroke, eraserStroke], 1);
    const afterErase = Array.from(ctx.getImageData(50, 50, 1, 1).data);

    return { before, afterPen, afterErase };
  });

  expect(result.before).toEqual([255, 255, 255, 255]);
  expect(result.afterPen).not.toEqual([255, 255, 255, 255]);
  expect(result.afterErase).toEqual([255, 255, 255, 255]);
});

test("a tap (2-point stroke) renders as a visible dot", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    const tap = {
      id: "t1",
      tool: "pen",
      color: "#dc2626",
      width: 10,
      points: [50, 50],
    };
    window.__canvas.redrawAll(ctx, canvas, [tap], 1);
    return Array.from(ctx.getImageData(50, 50, 1, 1).data);
  });
  expect(result).not.toEqual([255, 255, 255, 255]);
});
```

- [ ] **Step 4: Run and verify**

```bash
npx playwright test tests/strokes.spec.js
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add pure stroke-painting functions shared by canvas components"
```

---

### Task 5: Interactive Whiteboard component

**Files:**

- Create: `src/canvas/Whiteboard.jsx`
- Modify: `src/App.jsx`
- Test: `tests/whiteboard.spec.js`

**Interfaces:**

- Consumes: `CANVAS_W, CANVAS_H, PEN_SIZES, ERASER_SIZES, COLORS, DECIMATE_MIN_DIST, uid, paintStroke, redrawAll` from `src/canvas/strokes.js` (Task 4).
- Produces (used by Task 9's Test screen): `Whiteboard` default export, a `forwardRef` component with props `{ initialStrokes = [], fingerDraw, onFingerDrawChange }`, exposing via ref `{ getStrokes(): Stroke[], clearBoard(): void }`.

- [ ] **Step 1: Write `src/canvas/Whiteboard.jsx`**

```jsx
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  CANVAS_W,
  CANVAS_H,
  PEN_SIZES,
  ERASER_SIZES,
  COLORS,
  DECIMATE_MIN_DIST,
  uid,
  redrawAll,
} from "./strokes.js";

// A pointer is pruned from the tracked set after this many ms — iPadOS
// silently swallows some pointerup events, and a leaked entry would
// otherwise sit in the map forever. Ported from My Lesson Buddy's
// WhiteboardCanvas.jsx (see docs/superpowers/specs/2026-08-15-spelling-buddy-design.md).
const POINTER_STALE_MS = 800;

const Whiteboard = forwardRef(function Whiteboard(
  { initialStrokes = [], fingerDraw, onFingerDrawChange },
  ref,
) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef(
    initialStrokes.map((s) => ({ ...s, points: [...s.points] })),
  );
  const scaleRef = useRef(1);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const pendingResizeRef = useRef(false);
  const activePointersRef = useRef(new Map());
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [penSize, setPenSize] = useState("medium");
  const [eraserSize, setEraserSize] = useState("medium");
  const [strokeCount, setStrokeCount] = useState(strokesRef.current.length);

  function fullRepaint() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawAll(
      canvas.getContext("2d"),
      canvas,
      strokesRef.current,
      scaleRef.current,
    );
  }

  const fitCanvas = useCallback(() => {
    if (drawingRef.current) {
      pendingResizeRef.current = true;
      return;
    }
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const availW = container.clientWidth;
    const availH = container.clientHeight;
    if (!availW || !availH) return;
    const targetRatio = CANVAS_W / CANVAS_H;
    let cssW = availW;
    let cssH = cssW / targetRatio;
    if (cssH > availH) {
      cssH = availH;
      cssW = cssH * targetRatio;
    }
    // Backing store at devicePixelRatio so pen strokes stay crisp; resize is
    // deferred above while a stroke is in progress because reassigning
    // canvas.width/height flash-clears the surface mid-stroke.
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scaleRef.current = cssW / CANVAS_W;
    fullRepaint();
  }, []);

  useEffect(() => {
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, [fitCanvas]);

  // iPadOS recognizes system-wide multi-finger gestures (long-press ->
  // text-selection loupe, 3-finger tap/swipe -> Copy/Undo) above pointer
  // dispatch. `touch-action: none` stops the browser's own pan/zoom but not
  // these OS gestures — only preventDefault on the raw touch/gesture events
  // stops them, and it must be a non-passive listener since React's JSX
  // onTouch* props attach passively.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const stop = (e) => e.preventDefault();
    canvas.addEventListener("touchstart", stop, { passive: false });
    canvas.addEventListener("touchmove", stop, { passive: false });
    canvas.addEventListener("gesturestart", stop, { passive: false });
    canvas.addEventListener("gesturechange", stop, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", stop);
      canvas.removeEventListener("touchmove", stop);
      canvas.removeEventListener("gesturestart", stop);
      canvas.removeEventListener("gesturechange", stop);
    };
  }, []);

  function toLogical(clientX, clientY) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    return [(clientX - rect.left) / scale, (clientY - rect.top) / scale];
  }

  function prunePointers(now) {
    for (const [id, p] of activePointersRef.current) {
      if (now - p.t > POINTER_STALE_MS) activePointersRef.current.delete(id);
    }
  }

  function onPointerDown(e) {
    // Palm rejection: a touch pointer landing while a pen pointer is
    // tracked is presumed to be a resting palm, not a second intentional
    // finger, and is dropped without being tracked.
    if (e.pointerType === "touch") {
      for (const p of activePointersRef.current.values()) {
        if (p.type === "pen") return;
      }
    }
    const now = Date.now();
    prunePointers(now);
    activePointersRef.current.set(e.pointerId, { t: now, type: e.pointerType });

    const isDrawable = e.pointerType !== "touch" || fingerDraw;
    if (!isDrawable) return;

    const canvas = canvasRef.current;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a smoothness nicety, not required for drawing to work.
    }
    const [x, y] = toLogical(e.clientX, e.clientY);
    const strokeColor = tool === "eraser" ? "#ffffff" : color;
    const strokeWidth =
      tool === "eraser" ? ERASER_SIZES[eraserSize] : PEN_SIZES[penSize];
    const stroke = {
      id: uid(),
      tool,
      color: strokeColor,
      width: strokeWidth,
      points: [x, y],
    };
    strokesRef.current.push(stroke);
    setStrokeCount(strokesRef.current.length);
    drawingRef.current = true;
    lastPointRef.current = [x, y];
    fullRepaint();
  }

  function onPointerMove(e) {
    if (!drawingRef.current) return;
    const [x, y] = toLogical(e.clientX, e.clientY);
    const [lx, ly] = lastPointRef.current;
    if (Math.hypot(x - lx, y - ly) < DECIMATE_MIN_DIST) return;
    lastPointRef.current = [x, y];
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    stroke.points.push(x, y);

    // Fast path: append just the new segment onto the already-painted
    // canvas instead of replaying every stroke on every pointer move.
    // Eraser paints opaque white rather than using destination-out: this
    // board is a single flat canvas with no separate ink layer over a
    // background image (that's what destination-out is for), so punching
    // an alpha hole would cut through the white fill itself and leave a
    // transparent pixel, not a white one — inconsistent with strokes.js's
    // redrawAll, which paints eraser strokes as opaque white for the same
    // reason.
    const ctx = canvasRef.current.getContext("2d");
    ctx.save();
    ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    ctx.lineWidth = stroke.width * scaleRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lx * scaleRef.current, ly * scaleRef.current);
    ctx.lineTo(x * scaleRef.current, y * scaleRef.current);
    ctx.stroke();
    ctx.restore();
  }

  function onPointerUp(e) {
    activePointersRef.current.delete(e.pointerId);
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    if (pendingResizeRef.current) {
      pendingResizeRef.current = false;
      fitCanvas();
    }
  }

  function undo() {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    fullRepaint();
  }

  function clearBoard() {
    strokesRef.current = [];
    setStrokeCount(0);
    fullRepaint();
  }

  useImperativeHandle(ref, () => ({
    getStrokes: () =>
      strokesRef.current.map((s) => ({ ...s, points: [...s.points] })),
    clearBoard,
  }));

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div
        ref={containerRef}
        className="min-h-0 flex-1 rounded-2xl bg-white shadow-inner"
        data-stroke-count={strokeCount}
      >
        <canvas
          ref={canvasRef}
          style={{ touchAction: "none", display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white/80 p-3">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Pen colour ${c}`}
            onClick={() => {
              setTool("pen");
              setColor(c);
            }}
            className={`h-10 w-10 rounded-full border-4 ${tool === "pen" && color === c ? "border-slate-700" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
        {["fine", "medium", "thick"].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => {
              setTool("pen");
              setPenSize(size);
            }}
            className={`rounded-full px-3 py-2 text-sm font-semibold capitalize ${tool === "pen" && penSize === size ? "bg-slate-700 text-white" : "bg-slate-200"}`}
          >
            {size}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTool("eraser")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tool === "eraser" ? "bg-slate-700 text-white" : "bg-slate-200"}`}
        >
          Eraser
        </button>
        <button
          type="button"
          onClick={undo}
          className="rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clearBoard}
          className="rounded-full bg-rose-200 px-4 py-2 text-sm font-semibold"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onFingerDrawChange(!fingerDraw)}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${fingerDraw ? "bg-emerald-300" : "bg-slate-200"}`}
        >
          {fingerDraw ? "Finger draw: on" : "No pencil today?"}
        </button>
      </div>
    </div>
  );
});

export default Whiteboard;
```

- [ ] **Step 2: Overwrite `src/App.jsx` with the full new content**

```jsx
import { useRef, useState } from "react";
import Whiteboard from "./canvas/Whiteboard.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const wbRef = useRef(null);
  const [fingerDraw, setFingerDraw] = useState(false);

  function navigate(next, nextParams = {}) {
    setScreen(next);
    setParams(nextParams);
  }

  // Test-only harness routes, selected via ?harness=<name>. Lets Playwright
  // mount a single component full-screen instead of driving the whole app
  // to reach it — same rationale as the window.__storage/__audio hooks.
  const harness = new URLSearchParams(window.location.search).get("harness");
  if (harness === "whiteboard") {
    window.__wb = wbRef;
    return (
      <div style={{ height: "100vh" }}>
        <Whiteboard
          ref={wbRef}
          fingerDraw={fingerDraw}
          onFingerDrawChange={setFingerDraw}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800">
      {screen === "home" && (
        <div className="flex min-h-screen items-center justify-center">
          <h1 className="text-4xl font-bold">My Spelling Buddy</h1>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `tests/whiteboard.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("pointer strokes are recorded and undo removes the last one", async ({
  page,
}) => {
  await page.goto("/?harness=whiteboard");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();

  await canvas.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 10,
    clientY: box.y + 10,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 50,
    clientY: box.y + 50,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 50,
    clientY: box.y + 50,
    isPrimary: true,
  });

  let strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(1);
  expect(strokes[0].points.length).toBeGreaterThanOrEqual(2);

  await page.getByRole("button", { name: "Undo" }).click();
  strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(0);
});

test("a touch pointer does not draw unless finger-draw is toggled on", async ({
  page,
}) => {
  await page.goto("/?harness=whiteboard");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();

  await canvas.dispatchEvent("pointerdown", {
    pointerId: 2,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 2,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  let strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(0);

  await page.getByRole("button", { name: "No pencil today?" }).click();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 3,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 3,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(1);
});

test("clear empties the board", async ({ page }) => {
  await page.goto("/?harness=whiteboard");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 4,
    pointerType: "mouse",
    clientX: box.x + 5,
    clientY: box.y + 5,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 4,
    pointerType: "mouse",
    clientX: box.x + 5,
    clientY: box.y + 5,
    isPrimary: true,
  });
  await page.getByRole("button", { name: "Clear" }).click();
  const strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(0);
});
```

- [ ] **Step 4: Run and verify**

```bash
npx playwright test tests/whiteboard.spec.js
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add interactive Whiteboard with ported iPad pointer handling"
```

---

### Task 6: Read-only StrokeReplay component

**Files:**

- Create: `src/canvas/StrokeReplay.jsx`
- Modify: `src/App.jsx`
- Test: `tests/replay.spec.js`

**Interfaces:**

- Consumes: `CANVAS_W, CANVAS_H, redrawAll` from `src/canvas/strokes.js` (Task 4).
- Produces (used by Task 10's Review screen): `StrokeReplay` default export, props `{ strokes }`.

- [ ] **Step 1: Write `src/canvas/StrokeReplay.jsx`**

```jsx
import { useEffect, useRef } from "react";
import { CANVAS_W, CANVAS_H, redrawAll } from "./strokes.js";

export default function StrokeReplay({ strokes }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const cssW = container.clientWidth;
    const cssH = cssW / (CANVAS_W / CANVAS_H);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawAll(ctx, canvas, strokes || [], cssW / CANVAS_W);
  }, [strokes]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl bg-white shadow-inner"
      data-testid="stroke-replay"
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
```

- [ ] **Step 2: Overwrite `src/App.jsx` with the full new content**

```jsx
import { useRef, useState } from "react";
import Whiteboard from "./canvas/Whiteboard.jsx";
import StrokeReplay from "./canvas/StrokeReplay.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const wbRef = useRef(null);
  const [fingerDraw, setFingerDraw] = useState(false);

  function navigate(next, nextParams = {}) {
    setScreen(next);
    setParams(nextParams);
  }

  const harness = new URLSearchParams(window.location.search).get("harness");
  if (harness === "whiteboard") {
    window.__wb = wbRef;
    return (
      <div style={{ height: "100vh" }}>
        <Whiteboard
          ref={wbRef}
          fingerDraw={fingerDraw}
          onFingerDrawChange={setFingerDraw}
        />
      </div>
    );
  }
  if (harness === "replay") {
    return (
      <div style={{ height: "100vh" }}>
        <StrokeReplay strokes={window.__REPLAY_STROKES__ || []} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800">
      {screen === "home" && (
        <div className="flex min-h-screen items-center justify-center">
          <h1 className="text-4xl font-bold">My Spelling Buddy</h1>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Write `tests/replay.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("StrokeReplay renders given strokes read-only", async ({ page }) => {
  await page.addInitScript(() => {
    window.__REPLAY_STROKES__ = [
      {
        id: "s1",
        tool: "pen",
        color: "#1f2937",
        width: 10,
        points: [10, 10, 90, 90],
      },
    ];
  });
  await page.goto("/?harness=replay");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const hasInk = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255)
        return true;
    }
    return false;
  });
  expect(hasInk).toBe(true);
});
```

- [ ] **Step 4: Run and verify**

```bash
npx playwright test tests/replay.spec.js
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add read-only StrokeReplay for parent review"
```

---

### Task 7: Home, Parent menu, Lists screens, and navigation wiring

**Files:**

- Create: `src/praise.js`, `src/screens/Home.jsx`, `src/screens/ParentMenu.jsx`, `src/screens/Lists.jsx`
- Modify: `src/App.jsx`
- Test: `tests/navigation.spec.js`

**Interfaces:**

- Consumes: `window.__storage.getLists()/createList()` (Task 2).
- Produces: `onNavigate(screen, params)` contract that every subsequent screen task (8, 9, 10) implements — `navigate("editor", {listId})`, `navigate("test", {listId, shuffle})`, `navigate("review", {listId})` are the calls `Lists.jsx` makes into screens later tasks add.

- [ ] **Step 1: Write `src/praise.js`**

```js
const PRAISE = [
  "Great try, Chloe!",
  "You did it!",
  "Keep going — you're doing brilliantly!",
  "That's the spirit!",
  "Wonderful effort!",
  "Look at you go!",
  "So proud of you for trying!",
];

export function getRandomPraise() {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}
```

- [ ] **Step 2: Write `src/screens/Home.jsx`**

```jsx
export default function Home({ onNavigate }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-5xl font-bold text-slate-700">My Spelling Buddy</h1>
      <div className="flex flex-col gap-6 sm:flex-row">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="rounded-3xl bg-emerald-400 px-16 py-10 text-3xl font-bold text-white shadow-lg active:scale-95"
        >
          Practise
        </button>
        <button
          type="button"
          onClick={() => onNavigate("parentMenu")}
          className="rounded-3xl bg-slate-300 px-16 py-10 text-2xl font-semibold text-slate-700 shadow-lg active:scale-95"
        >
          Parents
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write `src/screens/ParentMenu.jsx`**

```jsx
export default function ParentMenu({ onNavigate }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h2 className="text-3xl font-bold text-slate-700">Parents</h2>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "manage" })}
        className="w-72 rounded-2xl bg-sky-400 px-8 py-6 text-xl font-semibold text-white shadow"
      >
        Manage Spelling Lists
      </button>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "review" })}
        className="w-72 rounded-2xl bg-amber-400 px-8 py-6 text-xl font-semibold text-white shadow"
      >
        Review Chloe's Work
      </button>
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="text-slate-500 underline"
      >
        Back
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write `src/screens/Lists.jsx`**

```jsx
import { useEffect, useState } from "react";

export default function Lists({ mode, onNavigate }) {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState(null);
  const [shuffle, setShuffle] = useState(false);

  async function refresh() {
    setLists(await window.__storage.getLists());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createList() {
    if (!newName.trim()) return;
    await window.__storage.createList(newName.trim());
    setNewName("");
    refresh();
  }

  const title = {
    practice: "Pick a list to practise",
    manage: "Manage lists",
    review: "Review a list",
  }[mode];

  return (
    <div className="min-h-screen p-6">
      <h2 className="mb-4 text-3xl font-bold text-slate-700">{title}</h2>
      {mode === "manage" && (
        <div className="mb-6 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New list name"
            className="rounded-xl border px-4 py-2"
          />
          <button
            type="button"
            onClick={createList}
            className="rounded-xl bg-sky-400 px-4 py-2 font-semibold text-white"
          >
            Add list
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => {
              if (mode === "manage") onNavigate("editor", { listId: list.id });
              else if (mode === "review")
                onNavigate("review", { listId: list.id });
              else setSelected(list.id);
            }}
            className={`rounded-2xl p-6 text-left shadow ${selected === list.id ? "bg-emerald-100" : "bg-white"}`}
          >
            <div className="text-xl font-semibold">{list.name}</div>
            <div className="text-sm text-slate-500">
              {list.wordOrder.length} words
            </div>
          </button>
        ))}
      </div>
      {mode === "practice" && selected && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white p-6 shadow">
          <label className="flex items-center gap-2 text-lg">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            Shuffle the words
          </label>
          <button
            type="button"
            onClick={() => onNavigate("test", { listId: selected, shuffle })}
            className="rounded-2xl bg-emerald-400 px-8 py-4 text-xl font-bold text-white"
          >
            Start!
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => onNavigate(mode === "practice" ? "home" : "parentMenu")}
        className="mt-8 text-slate-500 underline"
      >
        Back
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Overwrite `src/App.jsx` with the full new content**

```jsx
import { useRef, useState } from "react";
import Whiteboard from "./canvas/Whiteboard.jsx";
import StrokeReplay from "./canvas/StrokeReplay.jsx";
import Home from "./screens/Home.jsx";
import ParentMenu from "./screens/ParentMenu.jsx";
import Lists from "./screens/Lists.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const wbRef = useRef(null);
  const [fingerDraw, setFingerDraw] = useState(false);

  function navigate(next, nextParams = {}) {
    setScreen(next);
    setParams(nextParams);
  }

  const harness = new URLSearchParams(window.location.search).get("harness");
  if (harness === "whiteboard") {
    window.__wb = wbRef;
    return (
      <div style={{ height: "100vh" }}>
        <Whiteboard
          ref={wbRef}
          fingerDraw={fingerDraw}
          onFingerDrawChange={setFingerDraw}
        />
      </div>
    );
  }
  if (harness === "replay") {
    return (
      <div style={{ height: "100vh" }}>
        <StrokeReplay strokes={window.__REPLAY_STROKES__ || []} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800">
      {screen === "home" && <Home onNavigate={navigate} />}
      {screen === "parentMenu" && <ParentMenu onNavigate={navigate} />}
      {screen === "lists" && <Lists mode={params.mode} onNavigate={navigate} />}
    </div>
  );
}
```

- [ ] **Step 6: Write `tests/navigation.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("parent can create a list and see it in the practice picker", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Manage Spelling Lists" }).click();
  await page.getByPlaceholder("New list name").fill("Week 12 Chinese");
  await page.getByRole("button", { name: "Add list" }).click();
  await expect(page.getByText("Week 12 Chinese")).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Practise" }).click();
  await expect(page.getByText("Week 12 Chinese")).toBeVisible();
});

test("selecting a list in practice mode reveals shuffle + start", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => window.__storage.createList("Term 2 English"));
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Term 2 English").click();
  await expect(page.getByRole("button", { name: "Start!" })).toBeVisible();
  await expect(page.getByLabel("Shuffle the words")).toBeVisible();
});
```

- [ ] **Step 7: Run and verify**

```bash
npx playwright test tests/navigation.spec.js
```

Expected: 2 passed.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add Home, ParentMenu, and Lists screens with navigation"
```

---

### Task 8: Parent list editor

**Files:**

- Create: `src/screens/ListEditor.jsx`
- Modify: `src/App.jsx`
- Test: `tests/list-editor.spec.js`

**Interfaces:**

- Consumes: `window.__storage.{getList,getWords,addWord,deleteWord,reorderWords}` (Task 2), `window.__audio.startRecording` (Task 3), `onNavigate` (Task 7).
- Produces: `ListEditor` default export, props `{ listId, onNavigate }`, reached via `navigate("editor", { listId })`.

- [ ] **Step 1: Write `src/screens/ListEditor.jsx`**

```jsx
import { useEffect, useRef, useState } from "react";

export default function ListEditor({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [words, setWords] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [pendingAudio, setPendingAudio] = useState(null);
  const recorderRef = useRef(null);

  async function refresh() {
    setList(await window.__storage.getList(listId));
    setWords(await window.__storage.getWords(listId));
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  async function toggleRecord() {
    if (!recording) {
      recorderRef.current = await window.__audio.startRecording();
      setRecording(true);
    } else {
      const { blob, mime } = await recorderRef.current.stop();
      setPendingAudio({ blob, mime });
      setRecording(false);
    }
  }

  async function addWord() {
    if (!text.trim() || !pendingAudio) return;
    await window.__storage.addWord(listId, {
      text: text.trim(),
      audioBlob: pendingAudio.blob,
      audioMime: pendingAudio.mime,
    });
    setText("");
    setPendingAudio(null);
    refresh();
  }

  async function removeWord(wordId) {
    await window.__storage.deleteWord(listId, wordId);
    refresh();
  }

  async function move(index, dir) {
    const order = words.map((w) => w.id);
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    [order[index], order[j]] = [order[j], order[index]];
    await window.__storage.reorderWords(listId, order);
    refresh();
  }

  function playPending() {
    if (!pendingAudio) return;
    new Audio(URL.createObjectURL(pendingAudio.blob)).play().catch(() => {});
  }

  function playWord(word) {
    if (!word.audioBlob) return;
    new Audio(URL.createObjectURL(word.audioBlob)).play().catch(() => {});
  }

  if (!list) return null;

  return (
    <div className="min-h-screen p-6">
      <h2 className="mb-4 text-3xl font-bold text-slate-700">{list.name}</h2>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Word, phrase, or character"
          className="rounded-xl border px-4 py-2"
        />
        <button
          type="button"
          onClick={toggleRecord}
          className={`rounded-xl px-4 py-2 font-semibold text-white ${recording ? "bg-rose-500" : "bg-sky-500"}`}
        >
          {recording ? "Stop recording" : "Record"}
        </button>
        {pendingAudio && (
          <button
            type="button"
            onClick={playPending}
            className="rounded-xl bg-slate-200 px-4 py-2"
          >
            Play preview
          </button>
        )}
        <button
          type="button"
          onClick={addWord}
          disabled={!text.trim() || !pendingAudio}
          className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Add word
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {words.map((word, i) => (
          <li
            key={word.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow"
          >
            <span className="text-lg">{word.text}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playWord(word)}
                className="rounded-lg bg-slate-200 px-3 py-1"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="rounded-lg bg-slate-200 px-3 py-1"
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="rounded-lg bg-slate-200 px-3 py-1"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => removeWord(word.id)}
                className="rounded-lg bg-rose-200 px-3 py-1"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "manage" })}
        className="mt-8 text-slate-500 underline"
      >
        Back to lists
      </button>
    </div>
  );
}
```

- [ ] **Step 2: In `src/App.jsx`, add the import and the `editor` screen case**

Add `import ListEditor from "./screens/ListEditor.jsx";` alongside the other screen imports, and add this branch inside the final returned `<div>`, after the `lists` branch:

```jsx
{
  screen === "editor" && (
    <ListEditor listId={params.listId} onNavigate={navigate} />
  );
}
```

- [ ] **Step 3: Write `tests/list-editor.spec.js`**

```js
import { test, expect } from "@playwright/test";

async function mockRecorder(page) {
  await page.addInitScript(() => {
    class FakeTrack {
      stop() {}
    }
    class FakeStream {
      getTracks() {
        return [new FakeTrack()];
      }
    }
    class FakeMediaRecorder {
      constructor(stream, opts) {
        this.mimeType = (opts && opts.mimeType) || "audio/webm";
        this.listeners = {};
      }
      static isTypeSupported(type) {
        return type.startsWith("audio/webm");
      }
      addEventListener(evt, cb) {
        (this.listeners[evt] ||= []).push(cb);
      }
      start() {
        (this.listeners.dataavailable || []).forEach((cb) =>
          cb({ data: new Blob(["chunk"], { type: this.mimeType }) }),
        );
      }
      stop() {
        (this.listeners.stop || []).forEach((cb) => cb());
      }
    }
    window.MediaRecorder = FakeMediaRecorder;
    // navigator.mediaDevices is a getter-only accessor property in real
    // browsers — a plain assignment silently no-ops in the sloppy-mode
    // script addInitScript injects, leaving the real (unmocked) property in
    // place. Task 3 hit this same bug; reconfiguring the property descriptor
    // is the fix (see src/audio/... test in tests/audio.spec.js).
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      configurable: true,
      value: { getUserMedia: async () => new FakeStream() },
    });
  });
}

test("parent adds, reorders, and deletes a word", async ({ page }) => {
  await mockRecorder(page);
  await page.goto("/");
  const listId = await page.evaluate(
    async () => (await window.__storage.createList("Test List")).id,
  );

  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Manage Spelling Lists" }).click();
  await page.getByText("Test List").click();

  await page.getByPlaceholder("Word, phrase, or character").fill("apple");
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("button", { name: "Add word" }).click();
  await expect(page.getByText("apple")).toBeVisible();

  await page.getByPlaceholder("Word, phrase, or character").fill("banana");
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("button", { name: "Add word" }).click();
  await expect(page.getByText("banana")).toBeVisible();

  let words = await page.evaluate(
    ({ listId }) => window.__storage.getWords(listId),
    { listId },
  );
  expect(words.map((w) => w.text)).toEqual(["apple", "banana"]);

  await page
    .getByRole("listitem")
    .filter({ hasText: "banana" })
    .getByRole("button", { name: "Up" })
    .click();
  words = await page.evaluate(
    ({ listId }) => window.__storage.getWords(listId),
    { listId },
  );
  expect(words.map((w) => w.text)).toEqual(["banana", "apple"]);

  await page
    .getByRole("listitem")
    .filter({ hasText: "apple" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("apple")).toHaveCount(0);
});
```

- [ ] **Step 4: Run and verify**

```bash
npx playwright test tests/list-editor.spec.js
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add parent list editor with recording, playback, and reorder"
```

---

### Task 9: Test flow and Celebration

**Files:**

- Create: `src/screens/Test.jsx`, `src/screens/Celebration.jsx`
- Modify: `src/App.jsx`
- Test: `tests/test-flow.spec.js`

**Interfaces:**

- Consumes: `Whiteboard` (Task 5), `getRandomPraise` (Task 7), `window.__storage.{getWords,putAttempt}` (Task 2), `window.__audio.{playSaveChime,playFanfare}` (Task 3).
- Produces: `Test` default export `{ listId, shuffle, onNavigate }` reached via `navigate("test", {listId, shuffle})`; `Celebration` default export `{ listId, onNavigate }` reached via `navigate("celebration", {listId})`.

- [ ] **Step 1: Write `src/screens/Test.jsx`**

```jsx
import { useEffect, useRef, useState } from "react";
import Whiteboard from "../canvas/Whiteboard.jsx";
import { getRandomPraise } from "../praise.js";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Test({ listId, shuffle, onNavigate }) {
  const [words, setWords] = useState(null);
  const [index, setIndex] = useState(0);
  const [praise, setPraise] = useState(null);
  const [fingerDraw, setFingerDraw] = useState(false);
  const wbRef = useRef(null);

  useEffect(() => {
    (async () => {
      const loaded = await window.__storage.getWords(listId);
      setWords(shuffle ? shuffleArray(loaded) : loaded);
    })();
  }, [listId, shuffle]);

  if (!words) return null;
  if (words.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <p className="text-xl">
          This list has no words yet — ask a parent to add some!
        </p>
      </div>
    );
  }

  const word = words[index];

  function playWord() {
    if (!word.audioBlob) return;
    new Audio(URL.createObjectURL(word.audioBlob)).play().catch(() => {});
  }

  async function save() {
    const strokes = wbRef.current.getStrokes();
    await window.__storage.putAttempt(listId, word.id, strokes);
    await window.__audio.playSaveChime();
    setPraise(getRandomPraise());
  }

  function next() {
    setPraise(null);
    if (index + 1 >= words.length) {
      onNavigate("celebration", { listId });
    } else {
      setIndex(index + 1);
    }
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      <div className="mb-3 flex items-center gap-2">
        {words.map((_, i) => (
          <span
            key={i}
            className={`text-2xl ${i <= index ? "text-amber-400" : "text-slate-200"}`}
          >
            {"★"}
          </span>
        ))}
      </div>

      <button
        type="button"
        onClick={playWord}
        aria-label="Play the word"
        className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-400 text-4xl text-white shadow-lg active:scale-95"
      >
        {"▶"}
      </button>

      <div className="min-h-0 flex-1">
        <Whiteboard
          key={word.id}
          ref={wbRef}
          fingerDraw={fingerDraw}
          onFingerDrawChange={setFingerDraw}
        />
      </div>

      {!praise ? (
        <button
          type="button"
          onClick={save}
          className="mt-4 rounded-2xl bg-sky-500 px-8 py-4 text-2xl font-bold text-white shadow"
        >
          Save
        </button>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow">
          <p className="text-2xl font-bold text-emerald-600">{praise}</p>
          <button
            type="button"
            onClick={next}
            className="rounded-2xl bg-emerald-500 px-8 py-4 text-xl font-bold text-white"
          >
            Next word
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Write `src/screens/Celebration.jsx`**

```jsx
import { useEffect } from "react";

export default function Celebration({ onNavigate }) {
  useEffect(() => {
    window.__audio.playFanfare();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-6xl">{"⭐️🎉⭐️"}</p>
      <h2 className="text-4xl font-bold text-emerald-600">
        You finished the whole list, Chloe!
      </h2>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="rounded-2xl bg-emerald-500 px-8 py-4 text-xl font-bold text-white"
        >
          Practise Again
        </button>
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="rounded-2xl bg-slate-300 px-8 py-4 text-xl font-bold text-slate-700"
        >
          Home
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: In `src/App.jsx`, add the imports and the `test`/`celebration` screen cases**

Add `import Test from "./screens/Test.jsx";` and `import Celebration from "./screens/Celebration.jsx";` alongside the other screen imports, and add these branches after the `editor` branch:

```jsx
{
  screen === "test" && (
    <Test
      listId={params.listId}
      shuffle={params.shuffle}
      onNavigate={navigate}
    />
  );
}
{
  screen === "celebration" && (
    <Celebration listId={params.listId} onNavigate={navigate} />
  );
}
```

- [ ] **Step 4: Write `tests/test-flow.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("a full 2-word list can be practised end to end", async ({ page }) => {
  await page.goto("/");
  const listId = await page.evaluate(async () => {
    const list = await window.__storage.createList("Mini List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "cat",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    await window.__storage.addWord(list.id, {
      text: "dog",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    return list.id;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Mini List").click();
  await page.getByRole("button", { name: "Start!" }).click();

  await page.getByRole("button", { name: "Play the word" }).click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 10,
    clientY: box.y + 10,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Next word" })).toBeVisible();
  await page.getByRole("button", { name: "Next word" }).click();

  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();

  await expect(
    page.getByText("You finished the whole list, Chloe!"),
  ).toBeVisible();

  const attempts = await page.evaluate(
    async ({ listId }) => {
      const words = await window.__storage.getWords(listId);
      const out = [];
      for (const w of words)
        out.push(await window.__storage.getAttempt(listId, w.id));
      return out;
    },
    { listId },
  );
  expect(attempts.every((a) => Array.isArray(a) && a.length > 0)).toBe(true);
});

test("no scoring or right/wrong language appears anywhere in the practice flow", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Guard List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "sun",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Guard List").click();
  await page.getByRole("button", { name: "Start!" }).click();

  const banned = /wrong|incorrect|failed|score|percent|%/i;
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(banned);

  await page.getByRole("button", { name: "Save" }).click();
  const afterSave = await page.locator("body").innerText();
  expect(afterSave).not.toMatch(banned);
});
```

- [ ] **Step 5: Run and verify**

```bash
npx playwright test tests/test-flow.spec.js
```

Expected: 2 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Test practice flow and Celebration screen"
```

---

### Task 10: Parent review screen

**Files:**

- Create: `src/screens/Review.jsx`
- Modify: `src/App.jsx`
- Test: `tests/review.spec.js`

**Interfaces:**

- Consumes: `StrokeReplay` (Task 6), `window.__storage.{getList,getWords,getMarksForList,getAttempt,setMark}` (Task 2), `window.__audio.playHappyTick` (Task 3).
- Produces: `Review` default export `{ listId, onNavigate }` reached via `navigate("review", { listId })`.

- [ ] **Step 1: Write `src/screens/Review.jsx`**

```jsx
import { useEffect, useState } from "react";
import StrokeReplay from "../canvas/StrokeReplay.jsx";

export default function Review({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [rows, setRows] = useState([]);

  async function refresh() {
    const l = await window.__storage.getList(listId);
    setList(l);
    const words = await window.__storage.getWords(listId);
    const marks = await window.__storage.getMarksForList(listId);
    const built = [];
    for (const w of words) {
      const strokes = await window.__storage.getAttempt(listId, w.id);
      built.push({ word: w, strokes: strokes || [], ticked: !!marks[w.id] });
    }
    setRows(built);
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  async function tick(wordId) {
    await window.__storage.setMark(listId, wordId, true);
    await window.__audio.playHappyTick();
    refresh();
  }

  function playAudio(word) {
    if (!word.audioBlob) return;
    new Audio(URL.createObjectURL(word.audioBlob)).play().catch(() => {});
  }

  if (!list) return null;

  return (
    <div className="min-h-screen p-6">
      <h2 className="mb-6 text-3xl font-bold text-slate-700">
        Reviewing: {list.name}
      </h2>
      <div className="flex flex-col gap-6">
        {rows.map(({ word, strokes, ticked }) => (
          <div
            key={word.id}
            className="relative rounded-2xl bg-white p-4 shadow"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-2xl font-semibold">{word.text}</span>
              <button
                type="button"
                onClick={() => playAudio(word)}
                className="rounded-lg bg-slate-200 px-4 py-2"
              >
                Play
              </button>
            </div>
            <StrokeReplay strokes={strokes} />
            <button
              type="button"
              onClick={() => tick(word.id)}
              className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white"
            >
              Mark correct
            </button>
            {ticked && (
              <span
                role="img"
                aria-label="Marked correct"
                className="pointer-events-none absolute right-6 top-6 text-6xl text-emerald-500"
              >
                {"✓"}
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "review" })}
        className="mt-8 text-slate-500 underline"
      >
        Back to lists
      </button>
    </div>
  );
}
```

- [ ] **Step 2: In `src/App.jsx`, add the import and the `review` screen case**

Add `import Review from "./screens/Review.jsx";` alongside the other screen imports, and add this branch after the `celebration` branch:

```jsx
{
  screen === "review" && (
    <Review listId={params.listId} onNavigate={navigate} />
  );
}
```

- [ ] **Step 3: Write `tests/review.spec.js`**

```js
import { test, expect } from "@playwright/test";

test("parent can review a completed list and tick a word, and the tick persists", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Review List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    const word = await window.__storage.addWord(list.id, {
      text: "moon",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    await window.__storage.putAttempt(list.id, word.id, [
      {
        id: "s1",
        tool: "pen",
        color: "#1f2937",
        width: 6,
        points: [10, 10, 90, 90],
      },
    ]);
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Review List").click();

  await expect(page.getByText("moon")).toBeVisible();
  await page.getByRole("button", { name: "Mark correct" }).click();
  await expect(page.getByRole("img", { name: "Marked correct" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Review List").click();
  await expect(page.getByRole("img", { name: "Marked correct" })).toBeVisible();
});
```

- [ ] **Step 4: Run and verify**

```bash
npx playwright test tests/review.spec.js
```

Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add parent review screen with tick-to-mark and happy sound"
```

---

### Task 11: PWA manifest, icons, and deploy docs

**Files:**

- Create: `scripts/make-icons.mjs`, `public/icons/icon-192.png`, `public/icons/icon-512.png` (generated), `README.md`, `docs/manual-ipad-qa.md`
- Modify: `vite.config.js`, `index.html`
- Test: `tests/pwa.spec.js`

**Interfaces:**

- Consumes: nothing new — this task packages the already-built app.

- [ ] **Step 1: Write `scripts/make-icons.mjs`**

```js
// Generates two solid-colour PNG app icons (192x192, 512x512) with a
// centered white star, using only Node's built-in zlib — no image-library
// dependency for two static assets that never change after generation.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

function crc32(buf) {
  const table =
    crc32.table ||
    (crc32.table = (() => {
      const t = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++)
          c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
      }
      return t;
    })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function starMask(size, x, y) {
  const cx = size / 2;
  const cy = size / 2;
  const dx = x - cx;
  const dy = y - cy;
  const r = Math.hypot(dx, dy) / (size / 2);
  const theta = Math.atan2(dy, dx) + Math.PI / 2;
  const spikes = 5;
  const inner = 0.45;
  const outer = 0.95;
  const t = ((theta % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const seg = (2 * Math.PI) / spikes;
  const local = ((t % seg) + seg) % seg;
  const frac = Math.abs(local / seg - 0.5) * 2;
  const edge = inner + (outer - inner) * (1 - frac);
  return r < edge;
}

function makeIcon(size) {
  const bg = [56, 189, 248];
  const fg = [255, 255, 255];
  const raw = Buffer.alloc((size * 4 + 1) * size);
  let offset = 0;
  for (let y = 0; y < size; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = starMask(size, x, y) ? fg : bg;
      raw[offset++] = r;
      raw[offset++] = g;
      raw[offset++] = b;
      raw[offset++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const idat = deflateSync(raw);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", makeIcon(192));
writeFileSync("public/icons/icon-512.png", makeIcon(512));
console.log("Wrote public/icons/icon-192.png and icon-512.png");
```

- [ ] **Step 2: Generate the icons**

```bash
node scripts/make-icons.mjs
```

Expected: prints the confirmation line and creates both PNG files.

- [ ] **Step 3: Overwrite `vite.config.js` with the full new content**

```js
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
```

- [ ] **Step 4: Overwrite `index.html` with the full new content**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, viewport-fit=cover"
    />
    <meta name="theme-color" content="#38bdf8" />
    <link rel="apple-touch-icon" href="/icons/icon-192.png" />
    <title>My Spelling Buddy</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Write `tests/pwa.spec.js`**

```js
import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("build produces a web app manifest, service worker, and icons", () => {
  const dist = path.join(__dirname, "..", "dist");
  expect(existsSync(path.join(dist, "manifest.webmanifest"))).toBe(true);
  expect(existsSync(path.join(dist, "sw.js"))).toBe(true);
  expect(existsSync(path.join(dist, "icons", "icon-192.png"))).toBe(true);
});

test("index.html links the manifest and an apple touch icon", async ({
  page,
}) => {
  await page.goto("/");
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBeTruthy();
  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  expect(appleIcon).toContain("icon-192.png");
});
```

- [ ] **Step 6: Write `README.md`**

````markdown
# My Spelling Buddy

A spelling-practice app for Chloe: parents record words, Chloe practises
independently on an iPad with an Apple Pencil, and parents review and mark
her work later. No accounts, no server — everything lives on the device.

## Develop

```bash
npm install
npm run dev
```
````

Recording requires a secure context (HTTPS or `localhost`) — the dev server
counts, so recording works locally.

## Test

```bash
npm test
```

Runs `npm run build` + `npm run preview`, then the Playwright suite against
the production build (see `playwright.config.js`).

## Deploy

The app must be served over HTTPS for microphone recording to work on the
iPad — a plain LAN address from a dev server will not prompt for
microphone permission. Deploy the `dist/` output (`npm run build`) to any
static HTTPS host (Netlify, Vercel, GitHub Pages).

On the iPad, open the deployed URL in Safari, then **Share → Add to Home
Screen**. This is not optional polish: Safari can evict IndexedDB data for
a site that hasn't been opened in about a week, and installing to the Home
Screen exempts the app from that eviction, protecting Chloe's saved
recordings and handwriting.

See `docs/manual-ipad-qa.md` for the manual checks the automated suite
can't cover (Apple Pencil behavior, palm rejection, real device audio).

````

- [ ] **Step 7: Write `docs/manual-ipad-qa.md`**

```markdown
# Manual iPad QA

Run these by hand on the actual device after deploying — the automated
Playwright suite runs in headless Chromium and cannot exercise Apple
Pencil input, real microphone permission prompts, or Safari/Chrome-iOS
audio-unlock quirks.

- [ ] Apple Pencil writes on the whiteboard; a palm resting on the screen
      while writing does not add stray marks.
- [ ] With "No pencil today?" off, a finger touch does not draw. With it
      on, finger drawing works.
- [ ] A parent can record a word over the deployed HTTPS URL and play it
      back immediately.
- [ ] The save chime, fanfare, and happy tick all play audibly in both
      Safari and Chrome on the iPad.
- [ ] Add to Home Screen from Safari; relaunch from the Home Screen icon
      and confirm it opens full-screen (no browser chrome).
- [ ] After installing, close the app, wait, reopen it, and confirm
      previously saved lists/recordings/attempts are still present.
````

- [ ] **Step 8: Run and verify**

```bash
npx playwright test
```

Expected: the full suite passes (all tasks' spec files).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest, generated icons, and deploy documentation"
```

---

## Final verification

```bash
npm run build
npm run preview &
npx playwright test
```

Expected: every spec file across Tasks 1–11 passes against the production build.
