import { test, expect } from "@playwright/test";

// A 1x1 white PNG — the real reader is stubbed, so only the cover step needs
// something to draw on.
const PIXEL = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

// Callers load the page and install their reader stub first: a reload here
// would wipe it and the real reader would try to reach the internet.
async function openImport(page) {
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Manage Spelling Lists" }).click();
  await page.getByRole("button", { name: "New list from a photo" }).click();
}

test("cleans what the reader returns the way her real sheets need", async ({
  page,
}) => {
  await page.goto("/");
  const rows = await page.evaluate(() =>
    window.__import.normalizeWords([
      // 学拼音 sheet: pinyin with characters spread out in brackets
      { text: "shàng kè", speechText: "（上 课）", writeAs: "pinyin" },
      { text: "jiǎng gù shi", speechText: "讲 故 事", writeAs: "pinyin" },
      { text: "ā", speechText: "阿", writeAs: "pinyin" },
      // 学汉字 sheet: characters, a stray gap, a repeat
      { text: "每 个 老师", writeAs: "hanzi" },
      { text: "每个老师", writeAs: "hanzi" },
      // English table: Word column only
      { text: "  bangle ", writeAs: "english" },
      // tone numbers become marks; missing writeAs is worked out
      { text: "ni3 hao3", speechText: "你好" },
      { text: "" },
    ]),
  );
  expect(rows).toEqual([
    { text: "shàng kè", speechText: "上课", writeAs: "pinyin" },
    { text: "jiǎng gù shi", speechText: "讲故事", writeAs: "pinyin" },
    { text: "ā", speechText: "阿", writeAs: "pinyin" },
    { text: "每个老师", speechText: null, writeAs: "hanzi" },
    { text: "bangle", speechText: null, writeAs: "english" },
    { text: "nǐ hǎo", speechText: "你好", writeAs: "pinyin" },
  ]);
});

test("photo → cover her name → check the words → a new list with the right 'writes' tags", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.__sent = null;
    window.__import.readListPhoto = async (file, key, covers) => {
      window.__sent = { key, covers: covers.length };
      return {
        title: "第十七课 21 Oct",
        words: [
          { text: "shàng kè", speechText: "上 课", writeAs: "pinyin" },
          { text: "tái shàng", speechText: "台 上", writeAs: "pinyin" },
        ],
      };
    };
  });
  await openImport(page);

  // first time: asks for the key, which is kept on this device
  await page.getByLabel("Anthropic API key").fill("test-key-not-real");
  await page.getByRole("button", { name: "Save key" }).click();
  await page
    .getByLabel("Photo of the spelling list")
    .setInputFiles({ name: "sheet.png", mimeType: "image/png", buffer: PIXEL });

  const area = page.getByTestId("cover-area");
  await expect(area.locator("img")).toBeVisible();
  const box = await area.boundingBox();
  await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.2);
  await page.mouse.up();
  await expect(area.locator("[data-cover]")).toHaveCount(1);

  await page.getByRole("button", { name: "Read the words" }).click();
  await expect(page.getByLabel("List name")).toHaveValue("第十七课 21 Oct");
  await expect(page.getByLabel("Word 1", { exact: true })).toHaveValue("shàng kè");
  await expect(page.getByLabel("Characters for word 1")).toHaveValue("上课");
  expect(await page.evaluate(() => window.__sent)).toEqual({
    key: "test-key-not-real",
    covers: 1,
  });

  // fix a word, drop nothing, also practise the characters
  await page.getByLabel("Word 2", { exact: true }).fill("tái shàng!");
  await page.getByLabel("Word 2", { exact: true }).fill("tái shàng");
  await page.getByText("Also practise the characters").click();
  await page.getByRole("button", { name: "Create list (2 words)" }).click();

  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const lists = await window.__storage.getLists();
        const l = lists.find((x) => x.name === "第十七课 21 Oct");
        if (!l) return null;
        const words = await window.__storage.getWords(l.id);
        return words.map((w) => `${w.writeAs}:${w.text}:${w.speechText}`);
      }),
    )
    .toEqual([
      "pinyin:shàng kè:上课",
      "hanzi:上课:null",
      "pinyin:tái shàng:台上",
      "hanzi:台上:null",
    ]);
});

test("a rejected key or no internet says what to do next", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await window.__storage.setAiKey("bad-key");
    window.__import.readListPhoto = async () => {
      const e = new Error("That key was not accepted. Check it and try again.");
      e.kind = "key";
      throw e;
    };
  });
  await openImport(page);
  await page
    .getByLabel("Photo of the spelling list")
    .setInputFiles({ name: "sheet.png", mimeType: "image/png", buffer: PIXEL });
  await page.getByRole("button", { name: "Read the words" }).click();
  await expect(page.getByRole("alert")).toContainText("key was not accepted");
  await expect(
    page.getByRole("button", { name: "Enter a different key" }),
  ).toBeVisible();
});

test("the saved key never goes into a backup file", async ({ page }) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    await window.__storage.setAiKey("secret-test-key");
    const data = await window.__storage.exportData();
    return {
      leaked: JSON.stringify(data).includes("secret-test-key"),
      stored: await window.__storage.getAiKey(),
    };
  });
  expect(out).toEqual({ leaked: false, stored: "secret-test-key" });
});
