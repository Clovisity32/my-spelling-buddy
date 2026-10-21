import { test, expect } from "@playwright/test";

// Seeds `n` already-completed practices (and one list with a word, so the app
// has something to practise), then opens Home.
async function withPractices(page, n, { stickers = false } = {}) {
  await page.goto("/");
  await page.evaluate(
    async ({ count, stickers }) => {
      const list = await window.__storage.createList("Rewards list");
      const blob = new Blob(["a"], { type: "audio/webm" });
      await window.__storage.addWord(list.id, {
        text: "owl",
        audioBlob: blob,
        audioMime: "audio/webm",
      });
      for (let i = 0; i < count; i++) {
        const s = await window.__storage.startSession(list.id);
        await window.__storage.completeSession(s.id);
      }
      if (stickers) await window.__storage.setStickersEnabled(true);
    },
    { count: n, stickers },
  );
}

test("the sticker ladder carries on past the top sticker", async ({ page }) => {
  await withPractices(page, 50, { stickers: true });
  await page.goto("/");
  await page.getByRole("button", { name: "My Stickers" }).click();
  await expect(page.getByText("Spelling Champion")).toBeVisible();
  await expect(page.getByText("Next sticker in 25 practices!")).toBeVisible();
  await expect(page.getByText("Practise 75 times")).toBeVisible();
  await expect(page.getByText("Practise 500 times")).toBeVisible();
});

test("past the fixed stickers, a Superstar comes every 100 practices", async ({
  page,
}) => {
  await withPractices(page, 600, { stickers: true });
  await page.goto("/");
  await page.getByRole("button", { name: "My Stickers" }).click();
  await expect(page.getByText("Diamond Speller")).toBeVisible();
  await expect(page.getByText("Superstar 600")).toBeVisible();
  await expect(page.getByText("Next sticker in 100 practices!")).toBeVisible();
  await expect(page.getByText("Practise 700 times")).toBeVisible();
});

test("garden decorations appear on the Home lawn as practices add up", async ({
  page,
}) => {
  await withPractices(page, 11);
  await page.goto("/");
  await expect(page.locator("[data-garden-item]")).toHaveCount(0);

  await withPractices(page, 7); // 18 in all: flower bed + apple tree
  await page.goto("/");
  await expect(page.locator('[data-garden-item="flowers"]')).toHaveCount(1);
  await expect(page.locator('[data-garden-item="tree"]')).toHaveCount(1);
  await expect(page.locator('[data-garden-item="pond"]')).toHaveCount(0);

  await withPractices(page, 27); // 45: slide and duck pond too
  await page.goto("/");
  await expect(page.locator('[data-garden-item="slide"]')).toHaveCount(1);
  await expect(page.locator('[data-garden-item="pond"]')).toHaveCount(1);
  await expect(page.locator('[data-garden-item="rainbow"]')).toHaveCount(0);
});

test("fairy lights are strung up only at night", async ({ page }) => {
  await withPractices(page, 80);
  await page.goto("/?hour=12");
  await expect(page.locator('[data-garden-item="rainbow"]')).toHaveCount(1);
  await expect(page.locator('[data-garden-item="lights"]')).toHaveCount(0);
  await page.goto("/?hour=22");
  await expect(page.locator('[data-garden-item="lights"]')).toHaveCount(1);
});

test("a friend's wardrobe opens at its own milestone, and what it wears is remembered", async ({
  page,
}) => {
  await withPractices(page, 35);
  await page.goto("/");
  await page.getByRole("button", { name: "Dress up Buddy" }).click();
  await expect(
    page.getByRole("button", { name: "Outfits for lavender friend" }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Outfits for mint friend, locked" }),
  ).toBeDisabled();

  await page.getByRole("button", { name: "Outfits for lavender friend" }).click();
  // a friend keeps its own colour: only Buddy picks one
  await expect(page.getByText("Colour", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Crown" }).click();
  await expect
    .poll(() => page.evaluate(() => window.__storage.getFriendStyles()))
    .toEqual({ lavender: "crown" });

  // Buddy's own choice is untouched
  await page.getByRole("button", { name: "Outfits for Buddy" }).click();
  await expect(page.getByRole("button", { name: "Nothing" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("Celebration announces a new garden item", async ({ page }) => {
  await withPractices(page, 11);
  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Rewards list").click();
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  const at = (dx, dy) => ({
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + dx,
    clientY: box.y + dy,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerdown", at(10, 10));
  await canvas.dispatchEvent("pointermove", at(60, 60));
  await canvas.dispatchEvent("pointerup", at(60, 60));
  await page.getByRole("button", { name: "Save" }).click();
  await page.getByRole("button", { name: "Next word" }).click();
  // the 12th practice
  await expect(page.getByText("Flower bed in the garden")).toBeVisible();
});
