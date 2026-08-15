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

  const attempts = await page.evaluate(
    async ({ listId }) => {
      const words = await window.__storage.getWords(listId);
      const out = [];
      for (const w of words)
        out.push(await window.__storage.getAttempt(listId, w.id));
      return out;
    },
    { listId },
  );
  expect(attempts.every((a) => Array.isArray(a) && a.length > 0)).toBe(true);
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
