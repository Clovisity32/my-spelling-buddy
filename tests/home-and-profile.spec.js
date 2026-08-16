import { test, expect } from "@playwright/test";

// Save is guarded against an empty board (see Test.jsx), so any test that
// wants to reach "Next word" has to actually draw something first.
async function drawStroke(page) {
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
}

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
  await drawStroke(page);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();

  await expect(
    page.getByText("You finished the whole list, Mia!"),
  ).toBeVisible();
});

test("sticker rewards are hidden by default and only appear once a parent turns them on", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Sticker List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    await window.__storage.addWord(list.id, {
      text: "star",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
  });
  await page.goto("/");

  // Off by default: no entry point on the homepage.
  await expect(page.getByRole("button", { name: "My Stickers" })).toHaveCount(
    0,
  );

  // And no "new sticker" callout on Celebration, even though this is her
  // first completed practice (which would otherwise unlock one).
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Sticker List").click();
  await drawStroke(page);
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  await expect(
    page.getByText("You finished the whole list, Chloe!"),
  ).toBeVisible();
  await expect(page.getByText("You earned a new sticker")).toHaveCount(0);

  // A parent can turn it back on.
  await page.getByRole("button", { name: "Home" }).click();
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Back" }).click();

  await expect(page.getByRole("button", { name: "My Stickers" })).toBeVisible();
});
