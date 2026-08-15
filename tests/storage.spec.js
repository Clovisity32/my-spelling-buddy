import { test, expect } from "@playwright/test";

test("a word with its audio blob survives a reload", async ({ page }) => {
  await page.goto("/");
  const { listId, wordId } = await page.evaluate(async () => {
    const list = await window.__storage.createList("Week 1");
    const blob = new Blob(["fake-audio-bytes"], { type: "audio/webm" });
    const word = await window.__storage.addWord(list.id, {
      text: "apple",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    return { listId: list.id, wordId: word.id };
  });

  await page.reload();

  const result = await page.evaluate(
    async ({ listId, wordId }) => {
      const words = await window.__storage.getWords(listId);
      const word = words.find((w) => w.id === wordId);
      return {
        text: word?.text,
        mime: word?.audioMime,
        blobSize: word?.audioBlob?.size,
        isBlob: word?.audioBlob instanceof Blob,
      };
    },
    { listId, wordId },
  );

  expect(result.text).toBe("apple");
  expect(result.mime).toBe("audio/webm");
  expect(result.isBlob).toBe(true);
  expect(result.blobSize).toBeGreaterThan(0);
});

test("reorderWords and deleteWord update word order", async ({ page }) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("Week 2");
    const a = await window.__storage.addWord(list.id, {
      text: "a",
      audioBlob: null,
      audioMime: null,
    });
    const b = await window.__storage.addWord(list.id, {
      text: "b",
      audioBlob: null,
      audioMime: null,
    });
    await window.__storage.reorderWords(list.id, [b.id, a.id]);
    const reordered = await window.__storage.getWords(list.id);
    await window.__storage.deleteWord(list.id, a.id);
    const afterDelete = await window.__storage.getWords(list.id);
    return {
      reorderedTexts: reordered.map((w) => w.text),
      afterDeleteTexts: afterDelete.map((w) => w.text),
    };
  });
  expect(out.reorderedTexts).toEqual(["b", "a"]);
  expect(out.afterDeleteTexts).toEqual(["b"]);
});

test("deleteList removes the list along with its words, attempts, and marks", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("To Delete");
    const word = await window.__storage.addWord(list.id, {
      text: "gone",
      audioBlob: null,
      audioMime: null,
    });
    await window.__storage.putAttempt(list.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.setMark(list.id, word.id, true);

    await window.__storage.deleteList(list.id);

    const lists = await window.__storage.getLists();
    const words = await window.__storage.getWords(list.id);
    const attempt = await window.__storage.getAttempt(list.id, word.id);
    const marks = await window.__storage.getMarksForList(list.id);
    return {
      listStillExists: lists.some((l) => l.id === list.id),
      wordCount: words.length,
      attempt,
      markCount: Object.keys(marks).length,
    };
  });
  expect(out.listStillExists).toBe(false);
  expect(out.wordCount).toBe(0);
  expect(out.attempt).toBeNull();
  expect(out.markCount).toBe(0);
});

test("marks persist per list/word", async ({ page }) => {
  await page.goto("/");
  const marks = await page.evaluate(async () => {
    const list = await window.__storage.createList("Week 3");
    const w = await window.__storage.addWord(list.id, {
      text: "x",
      audioBlob: null,
      audioMime: null,
    });
    await window.__storage.setMark(list.id, w.id, true);
    return window.__storage.getMarksForList(list.id);
  });
  expect(Object.values(marks)[0]).toBe(true);
});
