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

// The "Got it!" celebration in Review — a fuller three-note rise than
// playHappyTick, for the moment a word is marked as learned rather than a
// quiet UI acknowledgement.
export async function playGotIt() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  const now = ctx.currentTime;
  tone(ctx, { freq: 659.25, start: now, duration: 0.12, type: "triangle" });
  tone(ctx, {
    freq: 830.61,
    start: now + 0.1,
    duration: 0.12,
    type: "triangle",
  });
  tone(ctx, {
    freq: 1046.5,
    start: now + 0.2,
    duration: 0.28,
    type: "triangle",
    gain: 0.25,
  });
}

// A very short, quiet tap — general button-press feedback, deliberately
// subtle so it doesn't compete with the more distinct celebratory sounds
// (chime/fanfare/happy tick) that follow specific actions.
export async function playClickSound() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  tone(ctx, {
    freq: 520,
    start: ctx.currentTime,
    duration: 0.05,
    type: "sine",
    gain: 0.12,
  });
}

// Plays right when a recording actually starts, so the parent has a clear
// "go" cue rather than guessing whether the mic is ready yet — recordings
// that start speaking before the cue lose their first fraction of a
// second, which is especially costly for a single short pinyin syllable.
export async function playRecordStartCue() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  tone(ctx, {
    freq: 1000,
    start: ctx.currentTime,
    duration: 0.08,
    type: "sine",
    gain: 0.18,
  });
}
