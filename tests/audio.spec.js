import { test, expect } from "@playwright/test";

test("synthesized sounds play without throwing", async ({ page }) => {
  await page.goto("/");
  await page.locator("body").click(); // user gesture, unlocks AudioContext
  const errors = await page.evaluate(async () => {
    const errs = [];
    for (const [name, fn] of [
      ["chime", window.__audio.playSaveChime],
      ["fanfare", window.__audio.playFanfare],
      ["tick", window.__audio.playHappyTick],
    ]) {
      try {
        await fn();
      } catch (e) {
        errs.push(`${name}: ${e.message}`);
      }
    }
    return errs;
  });
  expect(errors).toEqual([]);
});

test("speakWord converts raw tone-number pinyin and normalizes case before speaking, but leaves English text untouched", async ({
  page,
}) => {
  await page.goto("/");
  const spoken = await page.evaluate(() => {
    const captured = [];
    window.speechSynthesis.speak = (utterance) => {
      captured.push(utterance.text);
    };
    // Mixed/upper case, as a mobile keyboard's auto-capitalize or caps
    // lock would produce — this used to make some TTS engines spell the
    // word out as an acronym instead of speaking it as a syllable.
    window.__audio.speakWord("SAN1", "zh");
    // Untransformed tone-number pinyin, as if a parent chose "App reads
    // it" without first tapping the "ni3 hao3 -> nǐ hǎo" convert button.
    window.__audio.speakWord("Ni3 Hao3", "zh");
    window.__audio.speakWord("Hello", "en");
    return captured;
  });
  expect(spoken).toEqual(["sān", "nǐ hǎo", "Hello"]);
});

test("tone-mark conversion handles capitals and the v/ü stand-in", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(() => {
    const speak = (t) => {
      let said = null;
      const orig = window.speechSynthesis.speak;
      window.speechSynthesis.speak = (u) => {
        said = u.text;
      };
      window.__audio.speakWord(t, "zh");
      window.speechSynthesis.speak = orig;
      return said;
    };
    return {
      // A capital used to leave the mark stranded mid-word ("SāN").
      caps: speak("SAN1"),
      // "v" is the keyboard stand-in for ü. When the tone lands on a
      // different vowel the v was left untouched ("lvè" instead of "lüè").
      vBeforeTonedVowel: speak("lve4"),
      vCarryingTone: speak("nv3"),
    };
  });
  expect(out.caps).toBe("sān");
  expect(out.vBeforeTonedVowel).toBe("lüè");
  expect(out.vCarryingTone).toBe("nǚ");
});

test("speakWordEntry speaks a pinyin word's Chinese characters, not its romanization", async ({
  page,
}) => {
  await page.goto("/");
  const spoken = await page.evaluate(() => {
    const captured = [];
    window.speechSynthesis.speak = (u) => captured.push(u.text);
    // A Mandarin engine reads characters, not pinyin — the whole reason
    // speechText exists. The answer Chloe writes stays the pinyin.
    window.__audio.speakWordEntry({
      text: "nǐ hǎo",
      speechText: "你好",
      ttsLang: "zh",
    });
    // No characters supplied (an English word, or an older saved word):
    // fall back to the answer text itself.
    window.__audio.speakWordEntry({
      text: "apple",
      speechText: null,
      ttsLang: "en",
    });
    return captured;
  });
  expect(spoken).toEqual(["你好", "apple"]);
});

test("speakWordEntry's slow hint noticeably lowers the speech rate", async ({
  page,
}) => {
  await page.goto("/");
  const rates = await page.evaluate(() => {
    const captured = [];
    window.speechSynthesis.speak = (u) => captured.push(u.rate);
    window.__audio.speakWordEntry({ text: "owl", ttsLang: "en" });
    window.__audio.speakWordEntry(
      { text: "owl", ttsLang: "en" },
      { slow: true },
    );
    return captured;
  });
  const [normalRate, slowRate] = rates;
  expect(slowRate).toBeLessThan(normalRate);
  expect(slowRate).toBeLessThanOrEqual(0.5);
});

test("a word's Chinese characters survive a reload and drive playback", async ({
  page,
}) => {
  await page.goto("/");
  const listId = await page.evaluate(async () => {
    const list = await window.__storage.createList("Pinyin Week");
    await window.__storage.addWord(list.id, {
      text: "ni3 hao3",
      audioBlob: null,
      audioMime: null,
      useTts: true,
      ttsLang: "zh",
      speechText: "你好",
    });
    return list.id;
  });
  await page.reload();
  const spoken = await page.evaluate(
    async ({ listId }) => {
      const captured = [];
      window.speechSynthesis.speak = (u) => captured.push(u.text);
      const [word] = await window.__storage.getWords(listId);
      window.__audio.speakWordEntry(word);
      return captured;
    },
    { listId },
  );
  expect(spoken).toEqual(["你好"]);
});

test("recorder captures a blob from a mocked microphone", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeTrack {
      stop() {}
    }
    class FakeStream {
      getTracks() {
        return [new FakeTrack()];
      }
    }
    class FakeMediaRecorder {
      constructor(stream, opts) {
        this.mimeType = (opts && opts.mimeType) || "audio/webm";
        this.state = "inactive";
        this.listeners = {};
      }
      static isTypeSupported(type) {
        return type.startsWith("audio/webm");
      }
      addEventListener(evt, cb) {
        (this.listeners[evt] ||= []).push(cb);
      }
      start() {
        this.state = "recording";
        (this.listeners.dataavailable || []).forEach((cb) =>
          cb({ data: new Blob(["chunk"], { type: this.mimeType }) }),
        );
      }
      stop() {
        this.state = "inactive";
        (this.listeners.stop || []).forEach((cb) => cb());
      }
    }
    window.MediaRecorder = FakeMediaRecorder;
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      configurable: true,
      value: { getUserMedia: async () => new FakeStream() },
    });
  });
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const handle = await window.__audio.startRecording();
    const { blob, mime } = await handle.stop();
    return { size: blob.size, mime, isBlob: blob instanceof Blob };
  });
  expect(result.isBlob).toBe(true);
  expect(result.size).toBeGreaterThan(0);
  expect(result.mime).toContain("audio/webm");
});
