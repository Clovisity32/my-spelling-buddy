// The Christmas carol: "Jingle Bells" sung by every Buddy at once, in Web Audio
// (no audio files), with sleigh bells shaking on the beat.
import { ensureAudioContextRunning } from "./context.js";
import { buildCarol } from "../buddy/christmas.js";

// Octaves for the five singers (Buddy, then the four friends), so the chorus
// stays in tune while every voice sounds different.
const VOICES = [
  { mult: 1, gain: 0.07 },
  { mult: 2, gain: 0.05 },
  { mult: 1, gain: 0.05 },
  { mult: 2, gain: 0.04 },
  { mult: 0.5, gain: 0.07 },
];

function sing(ctx, { freq, start, dur, gain }) {
  const osc = ctx.createOscillator();
  const air = ctx.createOscillator();
  const lfo = ctx.createOscillator();
  const depth = ctx.createGain();
  const g = ctx.createGain();
  osc.type = "triangle";
  air.type = "sine";
  osc.frequency.value = freq;
  air.frequency.value = freq * 2;
  lfo.frequency.value = 5.5;
  depth.gain.value = freq * 0.006;
  lfo.connect(depth);
  depth.connect(osc.frequency);
  const end = start + dur * 0.92;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.04);
  g.gain.setValueAtTime(gain, Math.max(start + 0.05, end - 0.08));
  g.gain.linearRampToValueAtTime(0.0001, end);
  osc.connect(g);
  air.connect(g);
  g.connect(ctx.destination);
  for (const o of [osc, air, lfo]) {
    o.start(start);
    o.stop(end + 0.05);
  }
}

// A quick shake of three high, ringing notes.
function bell(ctx, start) {
  [3520, 4186, 5274].forEach((f, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = f;
    g.gain.setValueAtTime(0, start + i * 0.02);
    g.gain.linearRampToValueAtTime(0.025, start + i * 0.02 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.02 + 0.22);
    osc.connect(g).connect(ctx.destination);
    osc.start(start + i * 0.02);
    osc.stop(start + i * 0.02 + 0.25);
  });
}

// Plays the whole carol. Resolves with its length in ms (0 if audio is
// unavailable) — the lyrics are timed from the same plan (buildCarol).
export async function playJingleBells() {
  const ctx = await ensureAudioContextRunning();
  const plan = buildCarol();
  if (!ctx) return plan.totalMs;
  const t0 = ctx.currentTime + 0.05;
  plan.notes.forEach((n, i) => {
    VOICES.forEach((v, vi) =>
      sing(ctx, {
        freq: n.freq * v.mult,
        start: t0 + n.at + vi * 0.012,
        dur: n.dur,
        gain: v.gain,
      }),
    );
    if (i % 2 === 0) bell(ctx, t0 + n.at);
  });
  // The closing "Merry Christmas!" sparkle.
  const end = t0 + plan.totalMs / 1000 - 1.8;
  [1046.5, 1318.5, 1568, 2093].forEach((f, i) =>
    sing(ctx, { freq: f, start: end + i * 0.09, dur: 1.2, gain: 0.04 }),
  );
  return plan.totalMs;
}

// The "ooh!" when a present is unwrapped: a rising sparkle and a bell.
export async function playUnwrap() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  const t = ctx.currentTime + 0.02;
  [784, 988, 1175, 1568].forEach((f, i) =>
    sing(ctx, { freq: f, start: t + 0.9 + i * 0.1, dur: 0.35, gain: 0.07 }),
  );
  bell(ctx, t + 0.9);
  bell(ctx, t + 1.1);
}
