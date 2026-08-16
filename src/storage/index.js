// The only storage API the rest of the app is allowed to import. Every
// screen goes through here, never through idb.js directly — swapping in a
// network-backed adapter later means writing one new file against this same
// async interface and changing one import, not touching any screen.
import * as idb from "./idb.js";

const DEFAULT_CHILD_NAME = "Chloe";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createList(name) {
  const list = {
    id: uid(),
    name,
    createdAt: Date.now(),
    wordOrder: [],
    shuffle: false,
  };
  await idb.put("lists", list);
  return list;
}

// Shuffle is a per-list setting the parent chooses once (list editor), not
// a checkbox Chloe has to work through before every practice session.
export async function setListShuffle(listId, shuffle) {
  const list = await idb.get("lists", listId);
  if (!list) return;
  await idb.put("lists", { ...list, shuffle });
}

export async function getLists() {
  const lists = await idb.getAll("lists");
  return lists.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getList(listId) {
  return idb.get("lists", listId);
}

export async function renameList(listId, name) {
  const list = await idb.get("lists", listId);
  if (!list) return;
  await idb.put("lists", { ...list, name });
}

// Test seam only — see idb.js's closeDB for why this exists.
export async function closeDB() {
  await idb.closeDB();
}

// Also used directly by SessionHistory to let a parent delete a single
// practice session (with its attempts and marks) without touching the rest
// of the list's history.
export async function deleteSession(sessionId) {
  const attempts = await idb.getAllByIndex("attempts", "sessionId", sessionId);
  for (const a of attempts) await idb.del("attempts", a.id);
  const marks = await idb.getAllByIndex("marks", "sessionId", sessionId);
  for (const m of marks) await idb.del("marks", m.id);
  await idb.del("sessions", sessionId);
}

// Cascades: a list's words and every practice session (with that session's
// attempts and marks) are only ever referenced through it, so deleting the
// list without cleaning these up would leave them as permanent orphans in
// IndexedDB.
export async function deleteList(listId) {
  const words = await getWords(listId);
  const sessions = await getSessions(listId);
  for (const session of sessions) await deleteSession(session.id);
  for (const w of words) await idb.del("words", w.id);
  await idb.del("lists", listId);
}

// speechText is what the app's voice should actually say, when that differs
// from the answer Chloe has to write. Pinyin is the case this exists for:
// a Mandarin voice reads Chinese characters, not romanization, so a word
// whose text is "nǐ hǎo" needs speechText "你好" to be spoken correctly.
// null/empty means "just say text", which is right for Chinese characters
// and English words alike.
export async function addWord(
  listId,
  {
    text,
    audioBlob,
    audioMime,
    useTts = false,
    ttsLang = "zh",
    ttsVoiceURI = null,
    speechText = null,
  },
) {
  const word = {
    id: uid(),
    listId,
    text,
    audioBlob,
    audioMime,
    useTts,
    ttsLang,
    ttsVoiceURI,
    speechText: speechText?.trim() || null,
    createdAt: Date.now(),
  };
  await idb.put("words", word);
  const list = await idb.get("lists", listId);
  await idb.put("lists", { ...list, wordOrder: [...list.wordOrder, word.id] });
  return word;
}

export async function updateWord(wordId, fields) {
  const words = await idb.getAll("words");
  const word = words.find((w) => w.id === wordId);
  if (!word) return;
  await idb.put("words", { ...word, ...fields });
}

// Unlike deleteList, this used to leak the word's attempts and marks across
// every session it ever appeared in — orphan rows under a wordId nothing
// could reach again. Cascade them the same way deleteList does.
export async function deleteWord(listId, wordId) {
  await idb.del("words", wordId);
  const list = await idb.get("lists", listId);
  if (list) {
    await idb.put("lists", {
      ...list,
      wordOrder: list.wordOrder.filter((id) => id !== wordId),
    });
  }
  const attempts = await idb.getAllByIndex("attempts", "wordId", wordId);
  for (const a of attempts) await idb.del("attempts", a.id);
  const marks = await idb.getAllByIndex("marks", "wordId", wordId);
  for (const m of marks) await idb.del("marks", m.id);
}

export async function reorderWords(listId, wordIds) {
  const list = await idb.get("lists", listId);
  if (!list) return;
  await idb.put("lists", { ...list, wordOrder: wordIds });
}

export async function getWords(listId) {
  const words = await idb.getAllByIndex("words", "listId", listId);
  const list = await idb.get("lists", listId);
  const order = list?.wordOrder || [];
  const byId = new Map(words.map((w) => [w.id, w]));
  return order.map((id) => byId.get(id)).filter(Boolean);
}

// --- Practice sessions -----------------------------------------------
// A session is one run through a list, started from the Lists screen. A
// single-word "Not yet — try again" from Review writes back into the
// session it came from (same sitting), rather than starting a new one —
// that is the whole distinction between a fresh practice and a redo.

export async function startSession(listId) {
  const list = await idb.get("lists", listId);
  const session = {
    id: uid(),
    listId,
    startedAt: Date.now(),
    completedAt: null,
    wordCount: list ? list.wordOrder.length : 0,
  };
  await idb.put("sessions", session);
  return session;
}

export async function completeSession(sessionId) {
  const session = await idb.get("sessions", sessionId);
  if (!session) return;
  await idb.put("sessions", { ...session, completedAt: Date.now() });
}

export async function getSession(sessionId) {
  return idb.get("sessions", sessionId);
}

export async function getSessions(listId) {
  const sessions = await idb.getAllByIndex("sessions", "listId", listId);
  return sessions.sort((a, b) => b.startedAt - a.startedAt);
}

export async function getLatestSession(listId) {
  const sessions = await getSessions(listId);
  return sessions[0] || null;
}

// Every "how many times has this list been practised" figure shown to
// anyone (the Lists tile, Celebration's "this is your Nth time") must count
// only sessions that were actually finished — a session a child started and
// then backed out of before the last word shouldn't read as a practice that
// happened. getSessions() alone includes those; this is the filtered view
// every caller displaying a count should use instead.
export async function getCompletedSessions(listId) {
  const sessions = await getSessions(listId);
  return sessions.filter((s) => s.completedAt);
}

// One "got it" count per completed session, newest first — the raw material
// for "N more than last time" and personal-best comparisons.
export async function getSessionStats(listId) {
  const sessions = await getCompletedSessions(listId);
  const out = [];
  for (const s of sessions) {
    const marks = await getMarksForSession(s.id);
    const gotIt = Object.values(marks).filter((v) => v === "gotIt").length;
    out.push({ ...s, gotIt });
  }
  return out;
}

// Distinct calendar days (local time) with at least one completed session,
// counting back from today (or yesterday, if she hasn't practised yet
// today) with no gaps. Always about showing up, never about accuracy.
export async function getPracticeStreak() {
  const sessions = await idb.getAll("sessions");
  const days = new Set(
    sessions
      .filter((s) => s.completedAt)
      .map((s) => new Date(s.completedAt).toDateString()),
  );
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toDateString())) return 0;
  }
  while (days.has(cursor.toDateString())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// App-wide (not per-list) — this is what gates the sticker collection, so
// every list's practice contributes to the same growing set of stickers.
export async function getTotalCompletedSessionCount() {
  const sessions = await idb.getAll("sessions");
  return sessions.filter((s) => s.completedAt).length;
}

export async function putAttempt(sessionId, wordId, strokes) {
  await idb.put("attempts", {
    id: `${sessionId}:${wordId}`,
    sessionId,
    wordId,
    strokes,
    updatedAt: Date.now(),
  });
}

export async function getAttempt(sessionId, wordId) {
  const row = await idb.get("attempts", `${sessionId}:${wordId}`);
  return row ? row.strokes : null;
}

export async function getAttemptsForSession(sessionId) {
  const rows = await idb.getAllByIndex("attempts", "sessionId", sessionId);
  const out = {};
  for (const r of rows) out[r.wordId] = r.strokes;
  return out;
}

// state is 'gotIt' | 'notYet' | null — there is no boolean "correct" flag
// anymore. null means simply not marked yet, not "wrong".
export async function setMark(sessionId, wordId, state) {
  await idb.put("marks", {
    id: `${sessionId}:${wordId}`,
    sessionId,
    wordId,
    state,
    markedAt: Date.now(),
  });
}

export async function getMarksForSession(sessionId) {
  const rows = await idb.getAllByIndex("marks", "sessionId", sessionId);
  const out = {};
  for (const r of rows) out[r.wordId] = r.state;
  return out;
}

// --- Profile -----------------------------------------------------------

export async function getChildName() {
  const row = await idb.get("settings", "profile");
  return row?.childName || DEFAULT_CHILD_NAME;
}

export async function setChildName(name) {
  const trimmed = name?.trim();
  if (!trimmed) return;
  await idb.put("settings", { id: "profile", childName: trimmed });
}

// The sticker collection is built but off by default for now — a parent
// opts in from Parents rather than it appearing unannounced. Separate
// settings row from "profile" since this is a feature flag, not part of
// the child's identity.
export async function getStickersEnabled() {
  const row = await idb.get("settings", "features");
  return !!row?.stickersEnabled;
}

export async function setStickersEnabled(enabled) {
  const row = await idb.get("settings", "features");
  await idb.put("settings", {
    ...row,
    id: "features",
    stickersEnabled: !!enabled,
  });
}

// --- Backup / restore ---------------------------------------------------
// Everything lives in IndexedDB on one device with no sync, and IndexedDB
// can be evicted (storage pressure, "clear site data", iOS Safari's 7-day
// rule for a site that hasn't been opened). This is the escape hatch: a
// single JSON file a parent can save somewhere durable and restore from.

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function exportData() {
  const [lists, words, attempts, marks, sessions, settings] = await Promise.all(
    [
      idb.getAll("lists"),
      idb.getAll("words"),
      idb.getAll("attempts"),
      idb.getAll("marks"),
      idb.getAll("sessions"),
      idb.getAll("settings"),
    ],
  );
  const wordsOut = [];
  for (const w of words) {
    wordsOut.push({
      ...w,
      audioBlob: w.audioBlob ? await blobToDataUrl(w.audioBlob) : null,
      audioBlobEncoded: !!w.audioBlob,
    });
  }
  return {
    app: "spelling-buddy-backup",
    version: 2,
    exportedAt: Date.now(),
    lists,
    words: wordsOut,
    attempts,
    marks,
    sessions,
    settings,
  };
}

export async function importData(data) {
  if (!data || !Array.isArray(data.lists)) {
    throw new Error("That doesn't look like a Spelling Buddy backup file.");
  }
  for (const list of data.lists) await idb.put("lists", list);
  for (const word of data.words || []) {
    const { audioBlobEncoded, ...rest } = word;
    const audioBlob =
      audioBlobEncoded && rest.audioBlob
        ? await dataUrlToBlob(rest.audioBlob)
        : null;
    await idb.put("words", { ...rest, audioBlob });
  }
  for (const a of data.attempts || []) await idb.put("attempts", a);
  for (const m of data.marks || []) await idb.put("marks", m);
  for (const s of data.sessions || []) await idb.put("sessions", s);
  for (const s of data.settings || []) await idb.put("settings", s);
}
