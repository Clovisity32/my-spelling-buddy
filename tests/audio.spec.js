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
