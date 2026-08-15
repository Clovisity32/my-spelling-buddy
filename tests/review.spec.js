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
