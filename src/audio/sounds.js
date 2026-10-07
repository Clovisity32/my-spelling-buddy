// Synthesized feedback sounds — no audio files to ship, host, or fail to
// load. Every sound goes through ensureAudioContextRunning() rather than
// getAudioContext() directly, so a sound scheduled right after the unlock
// gesture isn't silently dropped on Chrome/iOS.
import { ensureAudioContextRunning } from "./context.js";
import { playBuddyChirp } from "./buddy-voice.js";

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

// ---- Buddy ----------------------------------------------------------------

// Pentatonic (C major) so any tap sequence sounds pleasant together.
const BUDDY_SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

// Quick rising boops with a little wobble — Buddy's giggle. `pitch` (about
// 0.8–1.3) gives each family member its own voice.
export function playBuddyGiggle(pitch = 1) {
  // Buddy's tap sound is its squeaky "pi-ka-chu" call (see buddy-voice.js).
  return playBuddyChirp(pitch);
}

// Knock-knock on Buddy's front door: two low wooden thuds. Resolves with how
// long the knock lasts (ms) so the caller can time what happens next.
export async function playKnock() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return 0;
  const now = ctx.currentTime;
  [0, 0.22].forEach((offset) => {
    tone(ctx, {
      freq: 190,
      start: now + offset,
      duration: 0.12,
      type: "triangle",
      gain: 0.4,
    });
    tone(ctx, {
      freq: 120,
      start: now + offset,
      duration: 0.16,
      type: "sine",
      gain: 0.3,
    });
  });
  return 450;
}

// One note per family member, for the tap-the-buddies xylophone.
export async function playBuddyNote(i = 0) {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  const freq =
    BUDDY_SCALE[
      ((i % BUDDY_SCALE.length) + BUDDY_SCALE.length) % BUDDY_SCALE.length
    ];
  const now = ctx.currentTime;
  tone(ctx, { freq, start: now, duration: 0.45, type: "triangle", gain: 0.22 });
  tone(ctx, {
    freq: freq * 2,
    start: now,
    duration: 0.2,
    type: "sine",
    gain: 0.06,
  });
}

// A cheerful ~7 second tune for the celebration: triangle lead, soft sine
// bass on the beat, sparkle on the last note. Returns the length in ms.
export async function playBuddySong() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return 0;
  const now = ctx.currentTime + 0.05;
  const beat = 0.34;
  // [scale index, beats]
  const melody = [
    [0, 1],
    [2, 1],
    [3, 1],
    [5, 1],
    [4, 1],
    [3, 1],
    [2, 2],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [3, 1],
    [2, 1],
    [1, 1],
    [0, 1],
    [2, 1],
    [3, 1],
    [5, 1],
    [6, 1],
    [5, 1],
    [3, 1],
    [5, 3],
  ];
  let t = 0;
  melody.forEach(([n, len]) => {
    tone(ctx, {
      freq: BUDDY_SCALE[n],
      start: now + t * beat,
      duration: len * beat * 0.9,
      type: "triangle",
      gain: 0.2,
    });
    t += len;
  });
  const total = t;
  for (let b = 0; b < total; b += 2) {
    const root = [261.63, 196, 220, 174.61][Math.floor(b / 6) % 4];
    tone(ctx, {
      freq: root,
      start: now + b * beat,
      duration: beat * 1.8,
      type: "sine",
      gain: 0.12,
    });
  }
  [2093, 2637, 3136].forEach((f, i) => {
    tone(ctx, {
      freq: f,
      start: now + (total - 3) * beat + 0.2 + i * 0.1,
      duration: 0.5,
      type: "sine",
      gain: 0.06,
    });
  });
  return Math.round(total * beat * 1000);
}
