// Crunchy munching for when Buddy is fed: a run of short filtered-noise bursts
// (the crunch) with a soft low "nom" under each. Synthesized, like every other
// sound here. Resolves with its length in ms.
import { ensureAudioContextRunning } from "./context.js";

export async function playMunch(pitch = 1, chews = 6) {
  const ctx = await ensureAudioContextRunning();
  if (!ctx) return 0;
  const gap = 0.32;
  const t0 = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * 0.09);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++)
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  for (let i = 0; i < chews; i++) {
    const t = t0 + i * gap;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = (1800 + (i % 2) * 700) * pitch;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(filter).connect(g).connect(ctx.destination);
    src.start(t);
    const osc = ctx.createOscillator();
    const og = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(260 * pitch, t);
    osc.frequency.exponentialRampToValueAtTime(140 * pitch, t + 0.12);
    og.gain.setValueAtTime(0.18, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(og).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  }
  return Math.round(chews * gap * 1000);
}
