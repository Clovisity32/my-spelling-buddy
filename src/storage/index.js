// The only storage API the rest of the app is allowed to import. Every
// screen goes through here, never through idb.js directly — swapping in a
// network-backed adapter later means writing one new file against this same
// async interface and changing one import, not touching any screen.
import * as idb from "./idb.js";

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function createList(name) {
  const list = { id: uid(), name, createdAt: Date.now(), wordOrder: [] };
  await idb.put("lists", list);
  return list;
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

export async function addWord(
  listId,
  {
    text,
    audioBlob,
    audioMime,
    useTts = false,
    ttsLang = "zh",
    ttsVoiceURI = null,
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

export async function deleteWord(listId, wordId) {
  await idb.del("words", wordId);
  const list = await idb.get("lists", listId);
  if (!list) return;
  await idb.put("lists", {
    ...list,
    wordOrder: list.wordOrder.filter((id) => id !== wordId),
  });
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

export async function putAttempt(listId, wordId, strokes) {
  await idb.put("attempts", {
    id: `${listId}:${wordId}`,
    strokes,
    updatedAt: Date.now(),
  });
}

export async function getAttempt(listId, wordId) {
  const row = await idb.get("attempts", `${listId}:${wordId}`);
  return row ? row.strokes : null;
}

export async function setMark(listId, wordId, ticked) {
  await idb.put("marks", {
    id: `${listId}:${wordId}`,
    ticked,
    markedAt: Date.now(),
  });
}

export async function getMarksForList(listId) {
  const words = await getWords(listId);
  const marks = {};
  for (const w of words) {
    const row = await idb.get("marks", `${listId}:${w.id}`);
    marks[w.id] = row ? row.ticked : false;
  }
  return marks;
}
