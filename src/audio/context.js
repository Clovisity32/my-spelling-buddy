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
