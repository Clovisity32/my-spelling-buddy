// Hug sounds for Buddy: a purr while held, and a soft "aww" on release.
import { ensureAudioContextRunning } from "./context.js";

// A soft, contented purr while Buddy is being hugged: a low sawtooth through
// a lowpass, with a fast tremolo for the rumble. Resolves to a stop()
// function that fades it out (call it on release), or a no-op when there is
// no audio context.
export async function startBuddyPurr() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return () => {};
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 62;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 220;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0, ctx.currentTime);
  out.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 0.25);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 24;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.04;
  lfo.connect(lfoDepth).connect(out.gain);
  osc.connect(lp).connect(out).connect(ctx.destination);
  osc.start();
  lfo.start();
  let stopped = false;
  return () => {
    if (stopped) return;
    stopped = true;
    const t = ctx.currentTime;
    out.gain.cancelScheduledValues(t);
    out.gain.setValueAtTime(out.gain.value, t);
    out.gain.linearRampToValueAtTime(0, t + 0.2);
    osc.stop(t + 0.25);
    lfo.stop(t + 0.25);
  };
}

function note(ctx, { freq, start, duration, gain }) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

// The little "aww" when a hug ends: two soft falling notes.
export async function playBuddyAww() {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return;
  const now = ctx.currentTime;
  note(ctx, { freq: 880, start: now, duration: 0.18, gain: 0.14 });
  note(ctx, { freq: 740, start: now + 0.14, duration: 0.3, gain: 0.12 });
}
