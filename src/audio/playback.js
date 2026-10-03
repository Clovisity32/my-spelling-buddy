// Recorded voice memos often come out quieter than the synthesized UI
// sounds and quieter than a plain <audio> element plays them back on an
// iPad speaker. A gain boost alone risks clipping on louder passages —
// a DynamicsCompressorNode after the gain squashes the peaks first, so
// the whole boosted signal stays loud without distorting.
import { ensureAudioContextRunning } from "./context.js";
import { speakWordEntry } from "./tts.js";

function boostChain(ctx, gain) {
  const gainNode = ctx.createGain();
  gainNode.gain.value = gain;
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -24;
  compressor.knee.value = 20;
  compressor.ratio.value = 8;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;
  gainNode.connect(compressor).connect(ctx.destination);
  return gainNode;
}

// Resolves when playback finishes (or fails), so callers can keep a "playing"
// state exactly as long as the sound lasts.
//
// A rate below 1 is the practice-screen "hint". An AudioBufferSourceNode's
// playbackRate is a plain resample — at 0.25 it drops the voice two octaves
// into an unintelligible growl. An <audio> element with preservesPitch
// time-stretches instead, keeping the voice natural; it still warbles below
// about 0.5, so the hint uses 0.6.
export async function playRecordedAudio(blob, gain = 3, rate = 1) {
  try {
    const ctx = await ensureAudioContextRunning();
    if (!ctx) throw new Error("no audio context");
    if (rate < 1) {
      const url = URL.createObjectURL(blob);
      const el = new Audio(url);
      el.preservesPitch = true;
      el.webkitPreservesPitch = true;
      el.mozPreservesPitch = true;
      el.playbackRate = rate;
      ctx.createMediaElementSource(el).connect(boostChain(ctx, gain));
      return new Promise((resolve) => {
        const done = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        el.onended = done;
        el.onerror = done;
        el.play().catch(done);
      });
    }
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(boostChain(ctx, gain));
    return new Promise((resolve) => {
      source.onended = resolve;
      source.start(0);
    });
  } catch {
    // Fall back to plain (unboosted) playback rather than staying silent.
    const el = new Audio(URL.createObjectURL(blob));
    if (rate < 1) {
      el.preservesPitch = true;
      el.playbackRate = rate;
    }
    return new Promise((resolve) => {
      el.onended = resolve;
      el.onerror = resolve;
      el.play().catch(resolve);
    });
  }
}

// The single "how does this word sound" decision, used everywhere a word
// entry needs to be played — Home, Test, Review, and the list editor's
// preview button all used to duplicate this same if/else. `slow` is the
// practice-screen hint button, regardless of whether the word is TTS or a
// parent's own recording. Returns a Promise that resolves when it finishes.
export function playWordEntry(word, { slow = false } = {}) {
  if (word.useTts) return speakWordEntry(word, { slow });
  if (word.audioBlob)
    return playRecordedAudio(word.audioBlob, 3, slow ? 0.6 : 1);
  return Promise.resolve();
}
