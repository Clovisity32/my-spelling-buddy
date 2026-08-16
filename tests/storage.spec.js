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

test("deleteWord cascades its attempts and marks across every session, not just one list", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("Leak Check");
    const word = await window.__storage.addWord(list.id, {
      text: "gone",
      audioBlob: null,
      audioMime: null,
    });
    const s1 = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(s1.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.setMark(s1.id, word.id, "gotIt");
    const s2 = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(s2.id, word.id, [
      { id: "s2", tool: "pen", color: "#000", width: 4, points: [2, 2, 6, 6] },
    ]);

    await window.__storage.deleteWord(list.id, word.id);

    const attempt1 = await window.__storage.getAttempt(s1.id, word.id);
    const attempt2 = await window.__storage.getAttempt(s2.id, word.id);
    const marks1 = await window.__storage.getMarksForSession(s1.id);
    return { attempt1, attempt2, marks1 };
  });
  expect(out.attempt1).toBeNull();
  expect(out.attempt2).toBeNull();
  expect(Object.keys(out.marks1).length).toBe(0);
});

test("deleteList removes the list along with its words, sessions, attempts, and marks", async ({
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
    const session = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.setMark(session.id, word.id, "gotIt");

    await window.__storage.deleteList(list.id);

    const lists = await window.__storage.getLists();
    const words = await window.__storage.getWords(list.id);
    const attempt = await window.__storage.getAttempt(session.id, word.id);
    const sessions = await window.__storage.getSessions(list.id);
    return {
      listStillExists: lists.some((l) => l.id === list.id),
      wordCount: words.length,
      attempt,
      sessionCount: sessions.length,
    };
  });
  expect(out.listStillExists).toBe(false);
  expect(out.wordCount).toBe(0);
  expect(out.attempt).toBeNull();
  expect(out.sessionCount).toBe(0);
});

test("marks persist per session/word and are tri-state", async ({ page }) => {
  await page.goto("/");
  const marks = await page.evaluate(async () => {
    const list = await window.__storage.createList("Week 3");
    const w = await window.__storage.addWord(list.id, {
      text: "x",
      audioBlob: null,
      audioMime: null,
    });
    const session = await window.__storage.startSession(list.id);
    await window.__storage.setMark(session.id, w.id, "gotIt");
    return window.__storage.getMarksForSession(session.id);
  });
  expect(Object.values(marks)[0]).toBe("gotIt");
});

test("practising a list twice creates two sessions, and the first session's strokes survive the second practice", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("Repeat List");
    const word = await window.__storage.addWord(list.id, {
      text: "again",
      audioBlob: null,
      audioMime: null,
    });

    const session1 = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session1.id, word.id, [
      {
        id: "first",
        tool: "pen",
        color: "#000",
        width: 4,
        points: [1, 1, 5, 5],
      },
    ]);
    await window.__storage.completeSession(session1.id);

    const session2 = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session2.id, word.id, [
      {
        id: "second",
        tool: "pen",
        color: "#000",
        width: 4,
        points: [9, 9, 20, 20],
      },
    ]);
    await window.__storage.completeSession(session2.id);

    const sessions = await window.__storage.getSessions(list.id);
    const strokes1 = await window.__storage.getAttempt(session1.id, word.id);
    const strokes2 = await window.__storage.getAttempt(session2.id, word.id);
    return { sessionCount: sessions.length, strokes1, strokes2 };
  });
  expect(out.sessionCount).toBe(2);
  expect(out.strokes1[0].id).toBe("first");
  expect(out.strokes2[0].id).toBe("second");
});

test("a redo from Review overwrites the attempt within the same session — no new session is created", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("Redo Same Session");
    const word = await window.__storage.addWord(list.id, {
      text: "cat",
      audioBlob: null,
      audioMime: null,
    });
    const session = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session.id, word.id, [
      {
        id: "original",
        tool: "pen",
        color: "#000",
        width: 4,
        points: [1, 1, 5, 5],
      },
    ]);
    await window.__storage.setMark(session.id, word.id, "gotIt");
    await window.__storage.completeSession(session.id);

    // The "not yet" flow: mark it, then redo into the SAME session id.
    await window.__storage.setMark(session.id, word.id, "notYet");
    await window.__storage.putAttempt(session.id, word.id, [
      {
        id: "redone",
        tool: "pen",
        color: "#000",
        width: 4,
        points: [9, 9, 20, 20],
      },
    ]);

    const sessions = await window.__storage.getSessions(list.id);
    const strokes = await window.__storage.getAttempt(session.id, word.id);
    const marks = await window.__storage.getMarksForSession(session.id);
    return { sessionCount: sessions.length, strokes, mark: marks[word.id] };
  });
  expect(out.sessionCount).toBe(1);
  expect(out.strokes[0].id).toBe("redone");
  expect(out.mark).toBe("notYet");
});

test("exportData/importData round-trips lists, words, audio, and session history", async ({
  page,
}) => {
  await page.goto("/");
  const before = await page.evaluate(async () => {
    const list = await window.__storage.createList("Backup Me");
    const blob = new Blob(["fake-audio-bytes"], { type: "audio/webm" });
    const word = await window.__storage.addWord(list.id, {
      text: "star",
      audioBlob: blob,
      audioMime: "audio/webm",
    });
    const session = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(session.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.setMark(session.id, word.id, "gotIt");
    await window.__storage.completeSession(session.id);
    await window.__storage.setChildName("Backup Kid");

    const data = await window.__storage.exportData();
    return { data, listId: list.id, wordId: word.id, sessionId: session.id };
  });

  // Simulate restoring onto a clean device: wipe IndexedDB, reload, import.
  // Close the app's own connection first — see the migration test below for
  // why an open connection makes deleteDatabase() hang instead of erroring.
  await page.evaluate(async () => {
    await window.__storage.closeDB();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase("spelling-buddy");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });
  });
  await page.reload();
  const after = await page.evaluate(
    async ({ data, listId, wordId, sessionId }) => {
      await window.__storage.importData(data);
      const list = await window.__storage.getList(listId);
      const words = await window.__storage.getWords(listId);
      const word = words.find((w) => w.id === wordId);
      const strokes = await window.__storage.getAttempt(sessionId, wordId);
      const marks = await window.__storage.getMarksForSession(sessionId);
      const childName = await window.__storage.getChildName();
      return {
        listName: list?.name,
        wordText: word?.text,
        isBlob: word?.audioBlob instanceof Blob,
        blobSize: word?.audioBlob?.size,
        strokesLen: strokes?.length,
        mark: marks[wordId],
        childName,
      };
    },
    before,
  );

  expect(after.listName).toBe("Backup Me");
  expect(after.wordText).toBe("star");
  expect(after.isBlob).toBe(true);
  expect(after.blobSize).toBeGreaterThan(0);
  expect(after.strokesLen).toBe(1);
  expect(after.mark).toBe("gotIt");
  expect(after.childName).toBe("Backup Kid");
});

test("upgrading a v1-shaped database (listId:wordId keys, boolean marks) preserves every attempt and mark under a synthetic legacy session", async ({
  page,
}) => {
  await page.goto("/");
  // Wipe whatever the app's own v2 openDB() call already created on this
  // page load, then rebuild the database from scratch at version 1 — the
  // exact shape a real pre-migration device would have on disk. Closing the
  // app's own connection first matters: indexedDB.deleteDatabase() only
  // "blocks" (silently, indefinitely) while another connection to the same
  // database is still open, and the page's own initial load already opened
  // one via window.__storage.
  const seed = await page.evaluate(async () => {
    await window.__storage.closeDB();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase("spelling-buddy");
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
      req.onblocked = () => resolve();
    });

    const listId = "legacy-list-1";
    const wordId = "legacy-word-1";
    await new Promise((resolve, reject) => {
      const req = indexedDB.open("spelling-buddy", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore("lists", { keyPath: "id" });
        const words = db.createObjectStore("words", { keyPath: "id" });
        words.createIndex("listId", "listId", { unique: false });
        db.createObjectStore("attempts", { keyPath: "id" });
        db.createObjectStore("marks", { keyPath: "id" });
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(
          ["lists", "words", "attempts", "marks"],
          "readwrite",
        );
        tx.objectStore("lists").put({
          id: listId,
          name: "Legacy List",
          createdAt: 1000,
          wordOrder: [wordId],
          shuffle: false,
        });
        tx.objectStore("words").put({
          id: wordId,
          listId,
          text: "legacy",
          audioBlob: null,
          audioMime: null,
          useTts: false,
          createdAt: 1000,
        });
        tx.objectStore("attempts").put({
          id: `${listId}:${wordId}`,
          strokes: [
            {
              id: "old",
              tool: "pen",
              color: "#000",
              width: 4,
              points: [1, 1, 2, 2],
            },
          ],
          updatedAt: 5000,
        });
        tx.objectStore("marks").put({
          id: `${listId}:${wordId}`,
          ticked: true,
          markedAt: 6000,
        });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
    return { listId, wordId };
  });

  // A fresh load re-runs the app's own openDB() call, this time seeing a
  // v1 database and triggering the real upgrade/migration path.
  await page.reload();

  const result = await page.evaluate(async ({ listId, wordId }) => {
    const sessions = await window.__storage.getSessions(listId);
    const session = sessions[0];
    const strokes = session
      ? await window.__storage.getAttempt(session.id, wordId)
      : null;
    const marks = session
      ? await window.__storage.getMarksForSession(session.id)
      : {};
    return {
      sessionCount: sessions.length,
      strokeId: strokes?.[0]?.id,
      mark: marks[wordId],
      wordCount: session?.wordCount,
    };
  }, seed);

  expect(result.sessionCount).toBe(1);
  expect(result.strokeId).toBe("old");
  expect(result.mark).toBe("gotIt");
  expect(result.wordCount).toBe(1);
});

test("an abandoned (never-completed) session is not counted as a practice, but a finished one is", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("Abandon Check");

    // Started but never finished — e.g. she backed out partway through.
    await window.__storage.startSession(list.id);
    const afterAbandoned = {
      completedSessions: (await window.__storage.getCompletedSessions(list.id))
        .length,
      totalCompletedGlobal:
        await window.__storage.getTotalCompletedSessionCount(),
    };

    const finished = await window.__storage.startSession(list.id);
    await window.__storage.completeSession(finished.id);
    const afterFinished = {
      completedSessions: (await window.__storage.getCompletedSessions(list.id))
        .length,
      totalCompletedGlobal:
        await window.__storage.getTotalCompletedSessionCount(),
      rawSessionCount: (await window.__storage.getSessions(list.id)).length,
    };

    return { afterAbandoned, afterFinished };
  });

  expect(out.afterAbandoned.completedSessions).toBe(0);
  expect(out.afterFinished.completedSessions).toBe(1);
  // Both sessions (abandoned + finished) exist in storage — only the
  // completed one counts toward anything shown to a parent or child.
  expect(out.afterFinished.rawSessionCount).toBe(2);
  expect(
    out.afterFinished.totalCompletedGlobal -
      out.afterAbandoned.totalCompletedGlobal,
  ).toBe(1);
});

test("deleteSession removes just that one session's attempts and marks, leaving the rest of the list's history intact", async ({
  page,
}) => {
  await page.goto("/");
  const out = await page.evaluate(async () => {
    const list = await window.__storage.createList("Prune One Session");
    const word = await window.__storage.addWord(list.id, {
      text: "leaf",
      audioBlob: null,
      audioMime: null,
    });

    const s1 = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(s1.id, word.id, [
      { id: "s1", tool: "pen", color: "#000", width: 4, points: [1, 1, 5, 5] },
    ]);
    await window.__storage.setMark(s1.id, word.id, "gotIt");
    await window.__storage.completeSession(s1.id);

    const s2 = await window.__storage.startSession(list.id);
    await window.__storage.putAttempt(s2.id, word.id, [
      { id: "s2", tool: "pen", color: "#000", width: 4, points: [2, 2, 6, 6] },
    ]);
    await window.__storage.completeSession(s2.id);

    await window.__storage.deleteSession(s1.id);

    const sessions = await window.__storage.getSessions(list.id);
    const attempt1 = await window.__storage.getAttempt(s1.id, word.id);
    const marks1 = await window.__storage.getMarksForSession(s1.id);
    const attempt2 = await window.__storage.getAttempt(s2.id, word.id);
    return {
      remainingSessionIds: sessions.map((s) => s.id),
      deletedId: s1.id,
      keptId: s2.id,
      attempt1,
      markCount1: Object.keys(marks1).length,
      attempt2,
    };
  });

  expect(out.remainingSessionIds).toEqual([out.keptId]);
  expect(out.remainingSessionIds).not.toContain(out.deletedId);
  expect(out.attempt1).toBeNull();
  expect(out.markCount1).toBe(0);
  expect(out.attempt2[0].id).toBe("s2");
});
