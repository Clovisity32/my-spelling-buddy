// Recorded voice memos often come out quieter than the synthesized UI
// sounds and quieter than a plain <audio> element plays them back on an
// iPad speaker. A gain boost alone risks clipping on louder passages —
// a DynamicsCompressorNode after the gain squashes the peaks first, so
// the whole boosted signal stays loud without distorting.
import { ensureAudioContextRunning } from "./context.js";

export async function playRecordedAudio(blob, gain = 3) {
  try {
    const ctx = await ensureAudioContextRunning();
    if (!ctx) throw new Error("no audio context");
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 20;
    compressor.ratio.value = 8;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;
    source.connect(gainNode).connect(compressor).connect(ctx.destination);
    source.start(0);
  } catch {
    // Fall back to plain (unboosted) playback rather than staying silent.
    new Audio(URL.createObjectURL(blob)).play().catch(() => {});
  }
}
