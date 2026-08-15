# My Spelling Buddy — Design Spec

## Context

Chloe (7) needs to practise spelling across three kinds of content: Chinese characters, pinyin, and English words/phrases. Her parents aren't always available to sit with her and dictate, so the app records the parent's voice once and lets Chloe practise independently — hearing each word, writing it by hand on an iPad with an Apple Pencil, and saving it for parents to mark later.

The explicit goal is **resilience**: Chloe should never feel like she's failing mid-test. She is never told right or wrong while practising. Every word she attempts earns warm, effort-based praise regardless of correctness. All judgement happens later, in a parent-only review screen.

This was brainstormed and approved via Claude Code's plan mode on 2026-08-15; the approved plan is preserved at `C:\Users\Admin\.claude\plans\i-would-like-to-replicated-sonnet.md`. This document is that design, restated as the spec this project's implementation plan argues from.

## Decisions

| Question          | Decision                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| Devices           | Local-first on one shared iPad, storage layer built so cloud sync can be added later without a rewrite |
| Word entry        | Parent records audio **and** types the correct answer                                                  |
| Word types        | One flat list — no chinese/pinyin/english tagging, one canvas style for everything                     |
| Feedback to Chloe | **None.** Effort-based praise only; she never sees right/wrong                                         |
| Rewards           | Visual progress path + per-word sound/animation + end-of-list celebration. **No numeric score**        |
| Parent lock       | None — one tap to switch modes                                                                         |
| Input             | iPad + Apple Pencil is the primary target                                                              |
| Lists             | A library of named lists ("Week 12 Chinese"), kept for re-testing                                      |
| Retries           | Chloe can redo a list; the latest attempt replaces the previous one                                    |
| Hosting           | Static build on a free HTTPS host, installed to the iPad Home Screen as a PWA                          |

## Reference implementation: My Lesson Buddy

`C:\Users\Admin\Documents\My Lesson Buddy` (sibling project) already solved the two hardest parts of this app, and its code is the source for the ported logic below:

- **Whiteboard**: `client/src/components/WhiteboardCanvas.jsx` — hand-rolled Canvas 2D, no drawing library. A stroke is `{ id, tool, color, width, points: [x0,y0,x1,y1,…] }`, a flat int array in a fixed logical coordinate space. Hard-won iPad fixes worth porting: Pointer Events with `touchAction: "none"`; pen/mouse always draw, finger only draws when a `fingerDraw` toggle is on; **palm rejection** — a touch pointer landing while a pen pointer is tracked is dropped, because a natural writing grip re-rests the palm every few strokes and this is "the dominant cause of every 2-3 strokes the next one doesn't render"; **stale-pointer pruning** at 800ms, because iPadOS silently swallows some pointerup events; **non-passive native listeners** for `touchstart`/`touchmove`/`gesturestart`/`gesturechange`, because React's JSX `onTouch*` props attach passively and can't `preventDefault` the OS's multi-finger gesture recognizer; a `devicePixelRatio` backing store with resize deferred until stroke-end, because reassigning `canvas.width` mid-stroke flash-clears it; a 2-point stroke renders as a filled dot so a tap is visible; distance-based decimation at a fixed logical threshold.
- **Audio unlock**: `client/src/audio.js` — a shared `AudioContext` singleton (constructing one per sound hits Safari's low single-digit cap on concurrent unclosed contexts), `ensureAudioContextRunning()` which **awaits** `resume()` (Chrome on iOS drops audio scheduled before the resume promise settles, where Safari tolerates the race), and `primeAudio()` doing a dual unlock — a silent 1-sample AudioContext buffer _and_ play/pause of a base64 silent WAV `<audio>` element in the same gesture, because Chrome on iOS gates `<audio>` playback separately from AudioContext.

This project explicitly does **not** port: Socket.IO streaming (no server here), zoom/pan/pinch (unnecessary for one word at a time, and the buggiest area of the source), teacher annotation, checklist sidebar, submit-lock, or board-image compositing. My Lesson Buddy has no audio _recording_ — `MediaRecorder` is new work for this project.

## Stack

Vite + React 18 + Tailwind 3, no backend, no accounts. Persistence is IndexedDB behind a storage abstraction so a network-backed adapter can be swapped in later without touching any screen.

## Data model (IndexedDB, database `spelling-buddy`)

```
lists    { id, name, createdAt, wordOrder: [wordId] }
words    { id, listId, text, audioBlob, audioMime, createdAt }
attempts { id: `${listId}:${wordId}`, strokes, updatedAt }   // latest replaces
marks    { id: `${listId}:${wordId}`, ticked: bool, markedAt }
```

Audio is stored as a `Blob` directly (IndexedDB structured-clones Blobs natively) — no base64 inflation. `attempts` and `marks` are keyed by the composite `listId:wordId`, so "latest attempt replaces" is a plain `put`.

## Screens

- **Home** — _Practise_ (Chloe) and _Parents_ buttons.
- **Parent menu** — _Manage Lists_ and _Review Work_.
- **Lists** (shared list-picker, three modes) — practice mode shows a card per list with a Shuffle toggle and Start button; manage mode adds a "new list" affordance and opens the list editor; review mode opens the review screen.
- **List editor** (parent) — rename the list; add words (text + record + playback preview + delete); reorder via up/down controls.
- **Test** (Chloe) — Play button, whiteboard, Save button advances to the next word with praise + a filling star path; Shuffle order was chosen on the Lists screen.
- **Celebration** — end-of-list fanfare and warm copy, then Practise Again / Home.
- **Review** (parent) — one scrolling card per word: answer text, parent's audio playback, Chloe's handwriting (read-only replay), a tick button that plays a happy sound and persists.

## Positive-reinforcement rules (binding requirements, not decoration)

- The words "wrong", "incorrect", "failed", and any score, percentage, or count-correct **never appear anywhere Chloe can see** (Home, Lists in practice mode, Test, Celebration).
- Every save is celebrated identically, regardless of what she wrote.
- Praise copy rotates from a pool so it doesn't feel canned.
- Progress is shown as distance travelled (stars filled), never as a mark.
- All sounds are synthesized via Web Audio — no audio files to ship or fail to load.

## Technical risks

- iOS `MediaRecorder` produces `audio/mp4`, not `audio/webm` — feature-detect via `MediaRecorder.isTypeSupported()` and store the actual mime with the blob.
- `getUserMedia` requires a secure context — this is why the app is deployed to HTTPS rather than served over the LAN.
- iOS evicts IndexedDB after ~7 days of Safari non-use for a site that isn't installed — installing to the Home Screen exempts it, so the install step protects Chloe's saved work.
- Audio playback needs a real user gesture to unlock — call `primeAudio()` from the first tap anywhere in the app.

## Out of scope

Cloud sync, parent accounts, multiple children, handwriting recognition / auto-marking, revisit-weak-words practice lists, drag-and-drop reordering (up/down controls instead — more reliable and Playwright-testable than drag-and-drop for a short list).
