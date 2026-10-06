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
    from: 1500 * pitch,
    to: 2600 * pitch,
    duration: 0.11,
    gain: 0.18,
  });
  squeak(ctx, {
    start: t + 0.15,
    from: 2500 * pitch,
    to: 2100 * pitch,
    duration: 0.07,
    gain: 0.16,
  });
  squeak(ctx, {
    start: t + 0.26,
    from: 2200 * pitch,
    to: 3300 * pitch,
    duration: 0.2,
    gain: 0.18,
    vibrato: 45,
  });
  return 480;
}

// Buddy "talks" in Pikachu-speak: a babble of tiny high chirps, one per
// syllable of the line, rising on questions and falling on a full stop. The
// browser's speech engine can't make a small voice (even at maximum pitch it
// sounds like a grown man), so the words are shown in the speech bubble and
// this is what is heard. Resolves with the length in ms.
// `tempo` (about 0.7–1.4) makes a friend chatter faster or drawl slower, so
// each one has its own voice, not just its own pitch.
export async function playBuddyBabble(text = "", pitch = 1, tempo = 1) {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return 0;
  const syllables = Math.min(
    14,
    Math.max(3, Math.round(text.replace(/[^a-z']/gi, "").length / 3)),
  );
  const question = /\?\s*$/.test(text);
  const t0 = ctx.currentTime + 0.02;
  let t = 0;
  for (let i = 0; i < syllables; i++) {
    const last = i === syllables - 1;
    // A bouncy melody: wander between a few high notes, with a bend at the end.
    const base = (1900 + ((i * 7) % 5) * 260) * pitch;
    const up = question && last;
    squeak(ctx, {
      start: t0 + t,
      from: base,
      to: up ? base * 1.5 : last ? base * 0.8 : base * (i % 2 ? 1.18 : 0.92),
      duration: (last ? 0.2 : 0.085) / tempo,
      gain: 0.15,
      vibrato: last ? 40 : 0,
    });
    t += (last ? 0.2 : 0.12) / tempo;
  }
  return Math.round(t * 1000);
}
