// Recorded voice memos often come out quieter than the synthesized UI
// sounds and quieter than a plain <audio> element plays them back on an
// iPad speaker — route playback through a GainNode boost instead.
import { ensureAudioContextRunning } from "./context.js";

export async function playRecordedAudio(blob, gain = 1.8) {
  try {
    const ctx = await ensureAudioContextRunning();
    if (!ctx) throw new Error("no audio context");
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    const gainNode = ctx.createGain();
    gainNode.gain.value = gain;
    source.connect(gainNode).connect(ctx.destination);
    source.start(0);
  } catch {
    // Fall back to plain (unboosted) playback rather than staying silent.
    new Audio(URL.createObjectURL(blob)).play().catch(() => {});
  }
}
