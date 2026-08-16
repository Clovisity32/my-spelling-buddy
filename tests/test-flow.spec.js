import { test, expect } from "@playwright/test";

test("a full 2-word list can be practised end to end", async ({ page }) => {
  await page.goto("/");
  const listId = await page.evaluate(async () => {
    const list = await window.__storage.createList("Mini List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "cat",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    await window.__storage.addWord(list.id, {
      text: "dog",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    return list.id;
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Mini List").click();

  await page.getByRole("button", { name: "Play the word" }).click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 10,
    clientY: box.y + 10,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Next word" })).toBeVisible();
  await page.getByRole("button", { name: "Next word" }).click();

  const canvas2 = page.locator("canvas");
  const box2 = await canvas2.boundingBox();
  await canvas2.dispatchEvent("pointerdown", {
    pointerId: 2,
    pointerType: "mouse",
    clientX: box2.x + 10,
    clientY: box2.y + 10,
    isPrimary: true,
  });
  await canvas2.dispatchEvent("pointermove", {
    pointerId: 2,
    pointerType: "mouse",
    clientX: box2.x + 60,
    clientY: box2.y + 60,
    isPrimary: true,
  });
  await canvas2.dispatchEvent("pointerup", {
    pointerId: 2,
    pointerType: "mouse",
    clientX: box2.x + 60,
    clientY: box2.y + 60,
    isPrimary: true,
  });

  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();

  await expect(
    page.getByText("You finished the whole list, Chloe!"),
  ).toBeVisible();

  const result = await page.evaluate(
    async ({ listId }) => {
      const words = await window.__storage.getWords(listId);
      const session = await window.__storage.getLatestSession(listId);
      const attempts = [];
      for (const w of words)
        attempts.push(await window.__storage.getAttempt(session.id, w.id));
      return {
        attempts,
        sessionCompleted: !!session.completedAt,
      };
    },
    { listId },
  );
  expect(result.attempts.every((a) => Array.isArray(a) && a.length > 0)).toBe(
    true,
  );
  // Finishing the whole list (not a single-word retry) marks the session
  // complete — this is what a fresh practice looks like versus a retry.
  expect(result.sessionCompleted).toBe(true);
});

test("an accidental Save on an empty board is blocked, and works once something is written", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Empty Save List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "owl",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Empty Save List").click();

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(/nothing's been written yet/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next word" })).toHaveCount(0);

  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 10,
    clientY: box.y + 10,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });

  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Next word" })).toBeVisible();
});

test("the hint button plays the word slowly, separately from the normal Play button", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Hint List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "kite",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Hint List").click();

  await page.evaluate(() => {
    window.__playCalls = [];
    window.__audio.playWordEntry = (word, opts) =>
      window.__playCalls.push({ text: word.text, slow: !!opts?.slow });
  });

  await page.getByRole("button", { name: "Play the word" }).click();
  await page.getByRole("button", { name: "Hint: say it slowly" }).click();

  const calls = await page.evaluate(() => window.__playCalls);
  expect(calls).toEqual([
    { text: "kite", slow: false },
    { text: "kite", slow: true },
  ]);
});

test("no scoring or right/wrong language appears anywhere in the practice flow", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Guard List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "sun",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Guard List").click();

  const banned = /wrong|incorrect|failed|score|percent|%/i;
  const bodyText = await page.locator("body").innerText();
  expect(bodyText).not.toMatch(banned);

  // Save is guarded against an empty board, so draw something first.
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 10,
    clientY: box.y + 10,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointermove", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 60,
    clientY: box.y + 60,
    isPrimary: true,
  });

  await page.getByRole("button", { name: "Save" }).click();
  const afterSave = await page.locator("body").innerText();
  expect(afterSave).not.toMatch(banned);

  await page.getByRole("button", { name: "Next word" }).click();
  await expect(
    page.getByText("You finished the whole list, Chloe!"),
  ).toBeVisible();
  const celebrationText = await page.locator("body").innerText();
  expect(celebrationText).not.toMatch(banned);
});
