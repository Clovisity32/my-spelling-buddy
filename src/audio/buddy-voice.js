// Buddy's voice: an original squeaky little "pi-ka-chu" chirp, synthesized
// from fast pitch glides with a touch of vibrato. Built from Web Audio rather
// than a sample so there's nothing to ship, and so each family member can
// have its own pitch.
import { ensureAudioContextRunning } from "./context.js";

function squeak(ctx, { start, from, to, duration, gain, vibrato = 0 }) {
  const osc = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const g = ctx.createGain();
  const og = ctx.createGain();
  osc.type = "triangle";
  overtone.type = "sine";
  osc.frequency.setValueAtTime(from, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + duration);
  overtone.frequency.setValueAtTime(from * 2, start);
  overtone.frequency.exponentialRampToValueAtTime(to * 2, start + duration);
  og.gain.value = 0.35; // the airy octave above is what makes it "cute"
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 32;
    depth.gain.value = vibrato;
    lfo.connect(depth);
    depth.connect(osc.frequency);
    lfo.start(start);
    lfo.stop(start + duration + 0.05);
  }
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g);
  overtone.connect(og).connect(g);
  g.connect(ctx.destination);
  osc.start(start);
  overtone.start(start);
  osc.stop(start + duration + 0.05);
  overtone.stop(start + duration + 0.05);
}

// "Pi-ka-chu!" — `pitch` (about 0.8–1.3) shifts the whole call. Resolves with
// its length in ms so speech can follow it.
export async function playBuddyChirp(pitch = 1) {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return 0;
  const t = ctx.currentTime;
  squeak(ctx, {
    start: t,
    from: 1000 * pitch,
    to: 1750 * pitch,
    duration: 0.11,
    gain: 0.18,
  });
  squeak(ctx, {
    start: t + 0.15,
    from: 1650 * pitch,
    to: 1450 * pitch,
    duration: 0.07,
    gain: 0.16,
  });
  squeak(ctx, {
    start: t + 0.26,
    from: 1400 * pitch,
    to: 2100 * pitch,
    duration: 0.2,
    gain: 0.18,
    vibrato: 45,
  });
  return 480;
}
