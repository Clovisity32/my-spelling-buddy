import { test, expect } from "@playwright/test";

test("parent can review a completed session and mark a word Got it!, and the mark persists", async ({
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
    const session = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session.id, word.id, [
      {
        id: "s1",
        tool: "pen",
        color: "#1f2937",
        width: 6,
        points: [10, 10, 90, 90],
      },
    ]);
    await window.__storage.completeSession(session.id);
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Review List").click();
  await page.getByRole("button", { name: /got it/ }).click();

  await expect(page.getByText("moon")).toBeVisible();
  await page.getByRole("button", { name: "Got it!" }).click();
  await expect(page.getByRole("img", { name: "You got it!" })).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Review List").click();
  await page.getByRole("button", { name: /got it/ }).click();
  await expect(page.getByRole("img", { name: "You got it!" })).toBeVisible();
});

test("parent can send a word back for 'not yet', and it returns to review in the same session with a fresh attempt", async ({
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
    const session = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.setMark(session.id, word.id, "gotIt");
    await window.__storage.completeSession(session.id);
    return { listId: list.id, wordId: word.id, sessionId: session.id };
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Redo List").click();
  await page.getByRole("button", { name: /got it/ }).click();
  await expect(page.getByRole("img", { name: "You got it!" })).toBeVisible();

  await page.getByRole("button", { name: "Not yet — try again" }).click();

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

  // A single-word retry ends with a distinct label rather than "Next word",
  // since there's no next word — it goes back to Review instead.
  await page.getByRole("button", { name: "Done — back to review" }).click();

  await expect(page.getByText("Reviewing: Redo List")).toBeVisible();
  const after = await page.evaluate(
    async ({ listId, wordId }) => {
      const sessions = await window.__storage.getSessions(listId);
      const session = sessions[0];
      const strokes = await window.__storage.getAttempt(session.id, wordId);
      return { sessionCount: sessions.length, strokes };
    },
    { listId, wordId },
  );
  // Still exactly one session — a "not yet" retry updates it in place
  // rather than starting a new history entry.
  expect(after.sessionCount).toBe(1);
  expect(after.strokes.length).toBeGreaterThan(0);
  await expect(page.getByRole("img", { name: "You got it!" })).toHaveCount(0);
});
