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
