import { test, expect } from "@playwright/test";

test("parent can create a list and see it in the practice picker", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Manage Spelling Lists" }).click();
  await page.getByPlaceholder("New list name").fill("Week 12 Chinese");
  await page.getByRole("button", { name: "Add list" }).click();
  await expect(page.getByText("Week 12 Chinese")).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Practise" }).click();
  await expect(page.getByText("Week 12 Chinese")).toBeVisible();
});

test("parent can delete a list from Manage lists, with an undo window", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await window.__storage.createList("Doomed List");
  });
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Manage Spelling Lists" }).click();
  await expect(page.getByText("Doomed List")).toBeVisible();

  await page.getByRole("button", { name: "Delete" }).click();
  // Scoped to the card's own button, not page.getByText: the undo toast's
  // "Deleted "Doomed List"" also contains "Doomed List" as a substring,
  // which would otherwise make this wait for the toast itself to vanish.
  await expect(page.getByRole("button", { name: "Doomed List" })).toHaveCount(
    0,
  );
  await expect(page.getByText('Deleted "Doomed List"')).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("button", { name: "Doomed List" })).toBeVisible();
});

test("tapping a list in practice mode starts it directly, no intermediate step", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Term 2 English");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "book",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Term 2 English").click();
  await expect(
    page.getByRole("button", { name: "Play the word" }),
  ).toBeVisible();
});
