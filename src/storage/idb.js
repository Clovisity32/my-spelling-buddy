// Thin promise wrapper over the raw IndexedDB API. No `idb` dependency —
// six stores and five operations don't need one.
const DB_NAME = "spelling-buddy";
const DB_VERSION = 2;

let dbPromise = null;

// v1 kept one attempt/mark per (listId, wordId) — a repeat practice
// silently overwrote the previous one, so there was no history of separate
// practice sessions. v2 introduces a `sessions` store (one row per run
// through a list) and re-keys attempts/marks under `${sessionId}:${wordId}`
// instead of `${listId}:${wordId}`. Every pre-existing attempt/mark is
// folded into one synthetic "legacy" session per list so nothing already
// saved becomes unreachable — see migrateLegacyAttemptsAndMarks below.
function migrateLegacyAttemptsAndMarks(tx) {
  const attemptsStore = tx.objectStore("attempts");
  const marksStore = tx.objectStore("marks");
  const sessionsStore = tx.objectStore("sessions");

  const splitId = (id) => {
    const i = id.indexOf(":");
    return i === -1 ? [id, id] : [id.slice(0, i), id.slice(i + 1)];
  };

  attemptsStore.getAll().onsuccess = (e1) => {
    const oldAttempts = (e1.target.result || []).filter((r) => !r.sessionId);
    marksStore.getAll().onsuccess = (e2) => {
      const oldMarks = (e2.target.result || []).filter((r) => !r.sessionId);
      if (oldAttempts.length === 0 && oldMarks.length === 0) return;

      // Group legacy rows by their old listId so each list's pre-migration
      // work lands in exactly one synthetic session.
      const groups = new Map(); // listId -> { minTs, words: Set }
      const touch = (listId, wordId, ts) => {
        let g = groups.get(listId);
        if (!g) {
          g = { minTs: ts, words: new Set() };
          groups.set(listId, g);
        }
        g.minTs = Math.min(g.minTs, ts);
        g.words.add(wordId);
      };
      for (const row of oldAttempts) {
        const [listId, wordId] = splitId(row.id);
        touch(listId, wordId, row.updatedAt || Date.now());
      }
      for (const row of oldMarks) {
        const [listId, wordId] = splitId(row.id);
        touch(listId, wordId, row.markedAt || Date.now());
      }

      const sessionIdFor = (listId) => `legacy-${listId}`;
      for (const [listId, g] of groups) {
        sessionsStore.put({
          id: sessionIdFor(listId),
          listId,
          startedAt: g.minTs,
          completedAt: g.minTs,
          wordCount: g.words.size,
          legacy: true,
        });
      }
      for (const row of oldAttempts) {
        const [listId, wordId] = splitId(row.id);
        const sessionId = sessionIdFor(listId);
        attemptsStore.delete(row.id);
        attemptsStore.put({
          id: `${sessionId}:${wordId}`,
          sessionId,
          wordId,
          strokes: row.strokes,
          updatedAt: row.updatedAt,
        });
      }
      for (const row of oldMarks) {
        const [listId, wordId] = splitId(row.id);
        const sessionId = sessionIdFor(listId);
        marksStore.delete(row.id);
        // Old `ticked: boolean` becomes the new tri-state `state`. A false/
        // unset old mark has no "not yet" equivalent worth inventing, so it
        // just becomes unmarked (null) rather than guessing.
        marksStore.put({
          id: `${sessionId}:${wordId}`,
          sessionId,
          wordId,
          state: row.ticked ? "gotIt" : null,
          markedAt: row.markedAt,
        });
      }
    };
  };
}

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      const tx = req.transaction;

      if (!db.objectStoreNames.contains("lists")) {
        db.createObjectStore("lists", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("words")) {
        const words = db.createObjectStore("words", { keyPath: "id" });
        words.createIndex("listId", "listId", { unique: false });
      }
      if (!db.objectStoreNames.contains("attempts")) {
        db.createObjectStore("attempts", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("marks")) {
        db.createObjectStore("marks", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("sessions")) {
        const sessions = db.createObjectStore("sessions", { keyPath: "id" });
        sessions.createIndex("listId", "listId", { unique: false });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }

      const attemptsStore = tx.objectStore("attempts");
      const marksStore = tx.objectStore("marks");
      if (!attemptsStore.indexNames.contains("sessionId")) {
        attemptsStore.createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!attemptsStore.indexNames.contains("wordId")) {
        attemptsStore.createIndex("wordId", "wordId", { unique: false });
      }
      if (!marksStore.indexNames.contains("sessionId")) {
        marksStore.createIndex("sessionId", "sessionId", { unique: false });
      }
      if (!marksStore.indexNames.contains("wordId")) {
        marksStore.createIndex("wordId", "wordId", { unique: false });
      }

      if (event.oldVersion < 2) {
        migrateLegacyAttemptsAndMarks(tx);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  return reqToPromise(tx.objectStore(storeName).get(key));
}

export async function getAll(storeName) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  return reqToPromise(tx.objectStore(storeName).getAll());
}

export async function getAllByIndex(storeName, indexName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readonly");
  return reqToPromise(tx.objectStore(storeName).index(indexName).getAll(value));
}

export async function put(storeName, value) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(value);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

// Closes the shared connection and clears the cached promise so the next
// openDB() call reconnects from scratch. Not needed by any screen — this
// exists for the test seam (window.__storage doubles as one, per main.jsx)
// so a test can force a real reconnect, e.g. to exercise the upgrade path
// against a database this same page already opened once.
export async function closeDB() {
  if (!dbPromise) return;
  const db = await dbPromise;
  db.close();
  dbPromise = null;
}

export async function del(storeName, key) {
  const db = await openDB();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).delete(key);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
