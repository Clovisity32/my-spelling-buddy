import { test, expect } from "@playwright/test";

test("StrokeReplay renders given strokes read-only", async ({ page }) => {
  await page.addInitScript(() => {
    window.__REPLAY_STROKES__ = [
      {
        id: "s1",
        tool: "pen",
        color: "#1f2937",
        width: 10,
        points: [10, 10, 90, 90],
      },
    ];
  });
  await page.goto("/?harness=replay");
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const hasInk = await page.evaluate(() => {
    const c = document.querySelector("canvas");
    const ctx = c.getContext("2d");
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== 255 || data[i + 1] !== 255 || data[i + 2] !== 255)
        return true;
    }
    return false;
  });
  expect(hasInk).toBe(true);
});
