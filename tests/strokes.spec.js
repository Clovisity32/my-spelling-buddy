import { test, expect } from "@playwright/test";

test("paintStroke draws a line and the eraser restores it to white", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    window.__canvas.redrawAll(ctx, canvas, [], 1);
    const before = Array.from(ctx.getImageData(50, 50, 1, 1).data);

    const penStroke = {
      id: "s1",
      tool: "pen",
      color: "#1f2937",
      width: 10,
      points: [10, 50, 90, 50],
    };
    window.__canvas.redrawAll(ctx, canvas, [penStroke], 1);
    const afterPen = Array.from(ctx.getImageData(50, 50, 1, 1).data);

    const eraserStroke = {
      id: "s2",
      tool: "eraser",
      color: "#ffffff",
      width: 20,
      points: [10, 50, 90, 50],
    };
    window.__canvas.redrawAll(ctx, canvas, [penStroke, eraserStroke], 1);
    const afterErase = Array.from(ctx.getImageData(50, 50, 1, 1).data);

    return { before, afterPen, afterErase };
  });

  expect(result.before).toEqual([255, 255, 255, 255]);
  expect(result.afterPen).not.toEqual([255, 255, 255, 255]);
  expect(result.afterErase).toEqual([255, 255, 255, 255]);
});

test("a tap (2-point stroke) renders as a visible dot", async ({ page }) => {
  await page.goto("/");
  const result = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext("2d");
    const tap = {
      id: "t1",
      tool: "pen",
      color: "#dc2626",
      width: 10,
      points: [50, 50],
    };
    window.__canvas.redrawAll(ctx, canvas, [tap], 1);
    return Array.from(ctx.getImageData(50, 50, 1, 1).data);
  });
  expect(result).not.toEqual([255, 255, 255, 255]);
});
