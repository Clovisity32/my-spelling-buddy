import { test, expect } from "@playwright/test";

test("parent can review a completed list and tick a word, and the tick persists", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Review List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    const word = await window.__storage.addWord(list.id, {
      text: "moon",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    await window.__storage.putAttempt(list.id, word.id, [
      {
        id: "s1",
        tool: "pen",
        color: "#1f2937",
        width: 6,
        points: [10, 10, 90, 90],
      },
    ]);
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Review List").click();

  await expect(page.getByText("moon")).toBeVisible();
  await page.getByRole("button", { name: "Mark correct" }).click();
  await expect(page.getByRole("img", { name: "Marked correct" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Review List").click();
  await expect(page.getByRole("img", { name: "Marked correct" })).toBeVisible();
});

test("parent can send a word back for a redo, and it returns to review with a fresh attempt", async ({
  page,
}) => {
  await page.goto("/");
  const { listId, wordId } = await page.evaluate(async () => {
    const list = await window.__storage.createList("Redo List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    const word = await window.__storage.addWord(list.id, {
      text: "cat",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    await window.__storage.putAttempt(list.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.setMark(list.id, word.id, true);
    return { listId: list.id, wordId: word.id };
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Redo List").click();
  await expect(page.getByRole("img", { name: "Marked correct" })).toBeVisible();

  await page.getByRole("button", { name: "Redo" }).click();

  // Clicking Redo clears the existing mark, since the attempt it applied to
  // is about to be overwritten.
  const markAfterRedo = await page.evaluate(
    ({ listId }) => window.__storage.getMarksForList(listId),
    { listId },
  );
  expect(Object.values(markAfterRedo)[0]).toBe(false);

  // Lands on the usual practice screen, scoped to just this one word.
  await expect(
    page.getByRole("button", { name: "Play the word" }),
  ).toBeVisible();

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

  // A single-word redo ends with a distinct label rather than "Next word",
  // since there's no next word — it goes back to Review instead.
  await page.getByRole("button", { name: "Done — back to review" }).click();

  await expect(page.getByText("Reviewing: Redo List")).toBeVisible();
  const strokesAfter = await page.evaluate(
    ({ listId, wordId }) => window.__storage.getAttempt(listId, wordId),
    { listId, wordId },
  );
  expect(strokesAfter.length).toBeGreaterThan(0);
  await expect(page.getByRole("img", { name: "Marked correct" })).toHaveCount(
    0,
  );
});
