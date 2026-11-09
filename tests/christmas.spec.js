import { test, expect } from "@playwright/test";

// Automated browsers only get the Christmas scene with ?xmas=1.

test("no Christmas theme without the switch (automated browsers)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByTestId("snow")).toHaveCount(0);
  await expect(page.getByTestId("christmas-tree")).toHaveCount(0);
});

test("the season opens on 9 November each year and never earlier", async ({
  page,
}) => {
  await page.goto("/");
  const on = await page.evaluate(() => {
    const s = window.__xmas.isChristmasSeason;
    return {
      oct2026: s(new Date(2026, 9, 31)),
      nov8: s(new Date(2026, 10, 8)),
      nov9: s(new Date(2026, 10, 9)),
      dec25: s(new Date(2026, 11, 25)),
      dec31: s(new Date(2026, 11, 31)),
      jan2027: s(new Date(2027, 0, 1)),
      jun2027: s(new Date(2027, 5, 1)),
      nov8_2027: s(new Date(2027, 10, 8)),
      nov9_2027: s(new Date(2027, 10, 9)),
      dec2030: s(new Date(2030, 11, 24)),
      dec2025: s(new Date(2025, 11, 24)),
    };
  });
  expect(on).toEqual({
    oct2026: false,
    nov8: false,
    nov9: true,
    dec25: true,
    dec31: true,
    jan2027: false,
    jun2027: false,
    nov8_2027: false,
    nov9_2027: true,
    dec2030: true,
    dec2025: false,
  });
});

test("snow, a lit tree with a star, and Santa outfits for everyone", async ({
  page,
}) => {
  await page.goto("/?xmas=1");
  await expect(page.getByTestId("snow")).toBeVisible();
  await expect(page.getByTestId("christmas-tree")).toBeVisible();
  // Lead Buddy + four friends each wear the hat and the scarf.
  await expect(page.locator('[data-festive="hat"]')).toHaveCount(5);
  await expect(page.locator('[data-festive="scarf"]')).toHaveCount(5);
  await expect(
    page.getByText("Merry Christmas", { exact: false }).first(),
  ).toBeVisible();
});

test("?xmas=0 switches the theme off", async ({ page }) => {
  await page.goto("/?xmas=0");
  await expect(page.getByTestId("snow")).toHaveCount(0);
  await expect(page.locator('[data-festive="hat"]')).toHaveCount(0);
});

test("everyone sings the carol and the snow falls harder", async ({ page }) => {
  await page.goto("/?xmas=1");
  const before = await page.locator(".xmas-flake").count();
  await page.getByRole("button", { name: "Sing Christmas carols" }).click();
  await expect(page.locator('[data-caroling="on"]')).toHaveCount(1);
  await expect(page.getByText("Jingle bells, jingle bells,")).toBeVisible();
  expect(await page.locator(".xmas-flake").count()).toBeGreaterThan(before);
});

test("Chloe gives a present to each Buddy", async ({ page }) => {
  await page.goto("/?xmas=1");
  // Start from a fresh day of presents.
  await page.evaluate(() => window.__storage.clearGifts());
  await page.reload();

  const targets = [
    "Buddy",
    ...["lavender", "mint", "butter", "rose"].map((c) => `${c} friend`),
  ];
  const colours = ["red", "gold", "green", "blue", "purple"];

  await page.getByRole("button", { name: /Give presents/ }).click();
  for (let i = 0; i < 4; i++) {
    await page
      .getByRole("button", { name: `Pick up the ${colours[i]} present` })
      .click();
    await page
      .getByRole("button", { name: `Give a present to ${targets[i]}` })
      .click();
    await expect(page.locator(`[data-gift-held]`)).toHaveCount(i + 1);
  }
  const gifts = await page.evaluate(() => window.__storage.getGifts());
  expect(Object.keys(gifts)).toHaveLength(4);

  // The same Buddy can't be given a second present.
  await page
    .getByRole("button", { name: "Pick up the purple present" })
    .click();
  await expect(
    page.getByRole("button", { name: "Give a present to Buddy" }),
  ).toHaveCount(0);

  // The last one makes everybody sing.
  await page
    .getByRole("button", { name: `Give a present to ${targets[4]}` })
    .click();
  await expect(page.locator(`[data-gift-held]`)).toHaveCount(5);
  await expect(page.locator('[data-caroling="on"]')).toHaveCount(1);
});

test("Buddies wear a mix of Santa, elf and reindeer outfits", async ({
  page,
}) => {
  await page.goto("/?xmas=1");
  const outfits = await page
    .locator('[data-festive="hat"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("data-outfit")));
  expect(outfits).toHaveLength(5);
  expect(new Set(outfits)).toEqual(new Set(["santa", "elf", "reindeer"]));
});

test("the presents hold different surprises on different days", async ({
  page,
}) => {
  await page.goto("/");
  const days = await page.evaluate(() => {
    const prizes = (d) =>
      window.__xmas
        .giftsForToday(d)
        .map((g) => g.prize)
        .join("");
    return {
      today: prizes(new Date(2026, 11, 24)),
      again: prizes(new Date(2026, 11, 24)),
      next: prizes(new Date(2026, 11, 25)),
      count: window.__xmas.giftsForToday(new Date(2026, 11, 24)).length,
    };
  });
  expect(days.today).toBe(days.again); // stable all day
  expect(days.today).not.toBe(days.next); // fresh the next day
  expect(days.count).toBe(5);
});
