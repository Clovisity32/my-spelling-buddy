import { test, expect } from "@playwright/test";

// Geometry assertions rather than screenshot diffing: these pin the exact
// failure that shipped to the iPad (the canvas painting over the toolbar
// after Save) without the maintenance cost of golden images.

async function seedAndStartPractice(page) {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Layout List");
    const blob = new Blob(["audio"], { type: "audio/webm" });
    for (const t of ["cat", "dog", "sun"]) {
      await window.__storage.addWord(list.id, {
        text: t,
        audioBlob: blob,
        audioMime: "audio/webm",
      });
    }
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Layout List").click();
}

for (const [orientation, size] of [
  ["landscape", { width: 1180, height: 820 }],
  ["portrait", { width: 820, height: 1180 }],
]) {
  test(`practice screen: the canvas never overlaps the toolbar, before or after Save (${orientation})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await seedAndStartPractice(page);

    const clear = page.getByRole("button", { name: "Clear" });
    const canvas = page.locator("canvas");

    const check = async (label) => {
      const c = await canvas.boundingBox();
      const t = await clear.boundingBox();
      // The canvas must end above the toolbar, not bleed across it.
      expect(
        c.y + c.height,
        `canvas overlaps toolbar ${label}`,
      ).toBeLessThanOrEqual(t.y + 1);
      // And the toolbar itself must be inside the viewport.
      expect(
        t.y + t.height,
        `toolbar past viewport bottom ${label}`,
      ).toBeLessThanOrEqual(size.height + 1);
    };

    await check("before save");

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Next word" })).toBeVisible();

    // The reported bug: saving swapped an 80px button for a 168px panel,
    // the canvas kept its stale size and covered the toolbar.
    await check("after save");
  });

  test(`practice screen: saving does not move anything above the footer (${orientation})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await seedAndStartPractice(page);

    const canvas = page.locator("canvas");
    const before = await canvas.boundingBox();

    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("button", { name: "Next word" })).toBeVisible();

    const after = await canvas.boundingBox();
    // Fixed-height footer slot means the whiteboard is untouched by the swap.
    expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
  });

  test(`practice screen: the progress heading is fully on screen (${orientation})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await seedAndStartPractice(page);
    // viewport-fit=cover used to let this sit under the status bar.
    const box = await page
      .getByRole("heading", { name: /Word 1 of 3/ })
      .boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
  });
}

test("review content column is centred, not flush against the left edge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 });
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Centre List");
    const blob = new Blob(["a"], { type: "audio/webm" });
    const word = await window.__storage.addWord(list.id, {
      text: "moon",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    const session = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.completeSession(session.id);
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Review Chloe's Work" }).click();
  await page.getByText("Centre List").click();
  await page.getByRole("button", { name: /got it/ }).click();

  // Was max-w-2xl with no mx-auto: the cards hugged the left edge while the
  // header spanned the full width above them.
  const heading = await page
    .getByRole("heading", { name: "Reviewing: Centre List" })
    .boundingBox();
  expect(heading.x).toBeGreaterThan(60);
});

test("no screen except Review scrolls the page itself", async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 });
  await page.goto("/");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
