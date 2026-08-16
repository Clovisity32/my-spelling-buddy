import { test, expect } from "@playwright/test";

test("tapping a word on the homepage says just that word, not the whole list", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Home Words");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "kite",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    await window.__storage.addWord(list.id, {
      text: "fish",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.goto("/");
  await page.evaluate(() => {
    window.__playedWords = [];
    window.__audio.playWordEntry = (word) =>
      window.__playedWords.push(word.text);
  });

  await page.getByRole("button", { name: 'Say "fish"' }).click();

  const played = await page.evaluate(() => window.__playedWords);
  expect(played).toEqual(["fish"]);
});

test("changing the child's name in Parents updates praise text on Celebration", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Name List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "sun",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.goto("/");

  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Change" }).click();
  await page.getByRole("textbox").fill("Mia");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Mia", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Name List").click();
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();

  await expect(
    page.getByText("You finished the whole list, Mia!"),
  ).toBeVisible();
});
