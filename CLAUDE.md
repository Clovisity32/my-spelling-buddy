# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-child spelling-practice PWA: a child hears a word, writes it on a
handwriting canvas, and a parent later reviews and marks each attempt. React
18 + Vite 5 + Tailwind 3, no router, no state library, no TypeScript. Data
lives entirely in IndexedDB on-device — see `src/storage/idb.js` for the
schema and `src/storage/index.js` for the only storage API the rest of the
app is allowed to import.

## Commands

- `npm run dev` — dev server (Vite, port 5173)
- `npm run build` — production build (required before the Playwright suite, which serves `dist/`)
- `npm run preview` — serve the production build (port 4173)
- `npm run test` / `npx playwright test` — full suite; the config's `webServer` already runs `build && preview` for you
- Single test file: `npx playwright test tests/review.spec.js`
- Single test by name: `npx playwright test -g "some test name"`
- `npm run build:gh-pages` — build with the `/my-spelling-buddy/` base path used for GitHub Pages

## Architecture

- **Screens** (`src/screens/*.jsx`) — one component per app screen. `App.jsx` holds all navigation as in-memory state (`screen`, `params`); there is no router, no URL-based routing, and no browser back-button support. Navigate via the `onNavigate(screen, params)` prop threaded through every screen.
- **Storage** (`src/storage/index.js` over `src/storage/idb.js`) — IndexedDB via a thin hand-written promise wrapper (no external `idb` dependency). Stores: `lists`, `words`, `sessions`, `attempts`, `marks`, `settings`. A **session** is one practice run through a list; `attempts` and `marks` are keyed `${sessionId}:${wordId}`, not `${listId}:${wordId}` — a fresh practice starts a new session, while redoing a single word from Review writes back into the session it came from. `idb.js`'s `DB_VERSION` upgrade handler is also where the one-time migration of pre-session data lives; bump it carefully and read the migration comment before changing the schema again.
- **Audio** (`src/audio/*.js`) — all synthesized via Web Audio (`sounds.js`, no audio asset files), plus TTS (`tts.js`, Mandarin-aware, explicitly excludes Cantonese voices) and voice-memo recording/playback (`recorder.js`, `playback.js`). `context.js` holds the single shared `AudioContext` (Safari caps concurrent contexts) and the unlock-on-first-tap logic iOS needs. `playWordEntry(word)` in `playback.js` is the one "how does this word sound" decision (TTS vs. recording) — every screen that plays a word entry should call it rather than re-deriving the if/else.
- **Canvas** (`src/canvas/*`) — `Whiteboard.jsx` is the live drawing surface (pointer events, palm rejection, undo); `strokes.js` holds stroke data structures and redraw logic shared with `StrokeReplay.jsx`, a read-only thumbnail used in Review.
- **Test seam**: `src/main.jsx` attaches the whole storage/audio/canvas API onto `window.__storage` / `window.__audio` / `window.__canvas`. Screens call through these rather than importing directly — this is also exactly how the Playwright suite drives and inspects the app (`page.evaluate(() => window.__storage...)`), so don't remove anything from these exports without checking `tests/`.

## Testing

Playwright, `tests/*.spec.js`, run against the built app (not dev server) per `playwright.config.js`. Tests generally seed data via `window.__storage` in `page.evaluate`, then drive the UI with role/text locators. IndexedDB persists across tests within a run — tests use unique list names rather than assuming a clean slate. Watch for accessible-name substring collisions between button labels (e.g. a "Save to a file" button will match `getByRole("button", { name: "Save" })`) — use `{ exact: true }` or reword the label.
