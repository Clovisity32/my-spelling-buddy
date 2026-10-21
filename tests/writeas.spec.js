import { test, expect } from "@playwright/test";

async function scribble(page) {
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
}

test("the practice screen says what to write, per word, and the voice cues Chinese words", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const list = await window.__storage.createList("Write list");
    const blob = new Blob(["a"], { type: "audio/webm" });
    const add = (w) => window.__storage.addWord(list.id, w);
    await add({ text: "owl", audioBlob: blob, audioMime: "audio/webm" });
    await add({ text: "你好", useTts: true });
    await add({ text: "nǐ hǎo", useTts: true, speechText: "你好" });
    // a parent's explicit choice beats what the content suggests
    await add({ text: "mama", useTts: true, writeAs: "pinyin" });
    window.__events = [];
    window.__audio.playWriteCue = async (w) => window.__events.push(`cue:${w.text}`);
    window.__audio.playWordEntry = async (w) => window.__events.push(`word:${w.text}`);
  });
  await page.getByRole("button", { name: "Practise" }).click();
  await page.getByText("Write list").click();

  const badge = page.locator("[data-write-as]");
  const expected = [
    ["english", "Write the English word"],
    ["hanzi", "Write the Chinese characters"],
    ["pinyin", "Write the hanyu pinyin"],
    ["pinyin", "Write the hanyu pinyin"],
  ];
  for (let i = 0; i < expected.length; i++) {
    await expect(badge).toHaveAttribute("data-write-as", expected[i][0]);
    await expect(badge).toContainText(expected[i][1]);
    await page.getByRole("button", { name: "Play the word" }).click();
    await scribble(page);
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByRole("button", { name: "Next word" }).click();
  }
  // each ▶ asked for the cue first, then the word
  expect(await page.evaluate(() => window.__events)).toEqual([
    "cue:owl",
    "word:owl",
    "cue:你好",
    "word:你好",
    "cue:nǐ hǎo",
    "word:nǐ hǎo",
    "cue:mama",
    "word:mama",
  ]);
});

test("the spoken cue is 写汉字 or 写拼音 in Mandarin, and nothing for English", async ({
  page,
}) => {
  await page.goto("/");
  const said = await page.evaluate(() => {
    const out = [];
    window.speechSynthesis.speak = (u) => out.push(`${u.text}|${u.lang}`);
    window.__audio.playWriteCue({ text: "你好" });
    window.__audio.playWriteCue({ text: "nǐ hǎo" });
    window.__audio.playWriteCue({ text: "ni3 hao3", writeAs: "hanzi" });
    window.__audio.playWriteCue({ text: "owl" });
    return out;
  });
  expect(said.map((s) => s.split("|")[0])).toEqual(["写汉字", "写拼音", "写汉字"]);
});

test("the list editor presets what she writes from the word, and a parent can change it", async ({
  page,
}) => {
  await page.goto("/");
  const listId = await page.evaluate(
    async () => (await window.__storage.createList("Editor list")).id,
  );
  await page.getByRole("button", { name: "Parents" }).click();
  await page.getByRole("button", { name: "Manage Spelling Lists" }).click();
  await page.getByText("Editor list").click();

  const input = page.getByPlaceholder("Word, phrase, character, or pinyin");
  const writes = (kind) =>
    page.getByRole("button", { name: `Chloe writes ${kind}` });
  const addAloud = async () => {
    await page.getByRole("button", { name: "App reads it" }).click();
    await page.getByRole("button", { name: "Add word" }).click();
  };

  await input.fill("你好");
  await expect(writes("Chinese characters")).toHaveAttribute("aria-pressed", "true");
  await addAloud();
  await expect(page.getByRole("listitem")).toHaveCount(1);

  await input.fill("nǐ hǎo");
  await expect(writes("Hanyu pinyin")).toHaveAttribute("aria-pressed", "true");
  await addAloud();
  await expect(page.getByRole("listitem")).toHaveCount(2);

  // pinyin typed without tone marks can't be told from English: she picks
  await input.fill("mama");
  await expect(writes("English")).toHaveAttribute("aria-pressed", "true");
  await writes("Hanyu pinyin").click();
  await addAloud();
  await expect(page.getByRole("listitem")).toHaveCount(3);

  const kinds = async () =>
    (await page.evaluate((id) => window.__storage.getWords(id), listId)).map(
      (w) => w.writeAs,
    );
  expect(await kinds()).toEqual(["hanzi", "pinyin", "pinyin"]);

  // change one on the list itself
  await page
    .getByRole("listitem")
    .filter({ hasText: "mama" })
    .getByLabel("What Chloe writes for mama")
    .selectOption("english");
  await expect.poll(kinds).toEqual(["hanzi", "pinyin", "english"]);
});
