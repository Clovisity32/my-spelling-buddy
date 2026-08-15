import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("build produces a web app manifest, service worker, and icons", () => {
  const dist = path.join(__dirname, "..", "dist");
  expect(existsSync(path.join(dist, "manifest.webmanifest"))).toBe(true);
  expect(existsSync(path.join(dist, "sw.js"))).toBe(true);
  expect(existsSync(path.join(dist, "icons", "icon-192.png"))).toBe(true);
});

test("index.html links the manifest and an apple touch icon", async ({
  page,
}) => {
  await page.goto("/");
  const manifestHref = await page
    .locator('link[rel="manifest"]')
    .getAttribute("href");
  expect(manifestHref).toBeTruthy();
  const appleIcon = await page
    .locator('link[rel="apple-touch-icon"]')
    .getAttribute("href");
  expect(appleIcon).toContain("icon-192.png");
});
