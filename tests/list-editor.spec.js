import { test, expect } from "@playwright/test";

async function mockRecorder(page) {
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
        this.listeners = {};
      }
      static isTypeSupported(type) {
        return type.startsWith("audio/webm");
      }
      addEventListener(evt, cb) {
        (this.listeners[evt] ||= []).push(cb);
      }
      start() {
        (this.listeners.dataavailable || []).forEach((cb) =>
          cb({ data: new Blob(["chunk"], { type: this.mimeType }) }),
        );
      }
      stop() {
        (this.listeners.stop || []).forEach((cb) => cb());
      }
    }
    window.MediaRecorder = FakeMediaRecorder;
    // navigator.mediaDevices is a getter-only accessor property in real
    // browsers — a plain assignment silently no-ops in the sloppy-mode
    // script addInitScript injects, leaving the real (unmocked) property in
    // place. Task 3 hit this same bug; reconfiguring the property descriptor
    // is the fix (see src/audio/... test in tests/audio.spec.js).
    Object.defineProperty(navigator, "mediaDevices", {
      writable: true,
      configurable: true,
      value: { getUserMedia: async () => new FakeStream() },
    });
  });
}

test("parent adds, reorders, and deletes a word", async ({ page }) => {
  await mockRecorder(page);
  await page.goto("/");
  const listId = await page.evaluate(
    async () => (await window.__storage.createList("Test List")).id,
  );

  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Manage Spelling Lists" }).click();
  await page.getByText("Test List").click();

  await page.getByPlaceholder("Word, phrase, or character").fill("apple");
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("button", { name: "Add word" }).click();
  await expect(page.getByText("apple")).toBeVisible();

  await page.getByPlaceholder("Word, phrase, or character").fill("banana");
  await page.getByRole("button", { name: "Record" }).click();
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("button", { name: "Add word" }).click();
  await expect(page.getByText("banana")).toBeVisible();

  let words = await page.evaluate(
    ({ listId }) => window.__storage.getWords(listId),
    { listId },
  );
  expect(words.map((w) => w.text)).toEqual(["apple", "banana"]);

  await page
    .getByRole("listitem")
    .filter({ hasText: "banana" })
    .getByRole("button", { name: "Up" })
    .click();
  words = await page.evaluate(
    ({ listId }) => window.__storage.getWords(listId),
    { listId },
  );
  expect(words.map((w) => w.text)).toEqual(["banana", "apple"]);

  await page
    .getByRole("listitem")
    .filter({ hasText: "apple" })
    .getByRole("button", { name: "Delete" })
    .click();
  await expect(page.getByText("apple")).toHaveCount(0);
});
