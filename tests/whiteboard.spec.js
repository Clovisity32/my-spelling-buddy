import { test, expect } from "@playwright/test";

test("pointer strokes are recorded and undo removes the last one", async ({
  page,
}) => {
  await page.goto("/?harness=whiteboard");
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
    clientX: box.x + 50,
    clientY: box.y + 50,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "mouse",
    clientX: box.x + 50,
    clientY: box.y + 50,
    isPrimary: true,
  });

  let strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(1);
  expect(strokes[0].points.length).toBeGreaterThanOrEqual(2);

  await page.getByRole("button", { name: "Undo" }).click();
  strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(0);
});

test("a touch pointer does not draw unless finger-draw is toggled on", async ({
  page,
}) => {
  await page.goto("/?harness=whiteboard");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();

  await canvas.dispatchEvent("pointerdown", {
    pointerId: 2,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 2,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  let strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(0);

  await page.getByRole("button", { name: "No pencil today?" }).click();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 3,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 3,
    pointerType: "touch",
    clientX: box.x + 20,
    clientY: box.y + 20,
    isPrimary: true,
  });
  strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(1);
});

test("clear empties the board", async ({ page }) => {
  await page.goto("/?harness=whiteboard");
  const canvas = page.locator("canvas");
  const box = await canvas.boundingBox();
  await canvas.dispatchEvent("pointerdown", {
    pointerId: 4,
    pointerType: "mouse",
    clientX: box.x + 5,
    clientY: box.y + 5,
    isPrimary: true,
  });
  await canvas.dispatchEvent("pointerup", {
    pointerId: 4,
    pointerType: "mouse",
    clientX: box.x + 5,
    clientY: box.y + 5,
    isPrimary: true,
  });
  await page.getByRole("button", { name: "Clear" }).click();
  const strokes = await page.evaluate(() => window.__wb.current.getStrokes());
  expect(strokes.length).toBe(0);
});
