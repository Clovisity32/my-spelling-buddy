import { useEffect, useRef, useState } from "react";

export default function ListEditor({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [words, setWords] = useState([]);
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [pendingAudio, setPendingAudio] = useState(null);
  const [recordError, setRecordError] = useState(null);
  const recorderRef = useRef(null);

  async function refresh() {
    setList(await window.__storage.getList(listId));
    setWords(await window.__storage.getWords(listId));
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  async function toggleRecord() {
    if (!recording) {
      setRecordError(null);
      try {
        recorderRef.current = await window.__audio.startRecording();
        setRecording(true);
      } catch {
        setRecordError(
          "Couldn't access the microphone. Check your browser's microphone permission and try again.",
        );
      }
    } else {
      const { blob, mime } = await recorderRef.current.stop();
      setPendingAudio({ blob, mime });
      setRecording(false);
    }
  }

  async function addWord() {
    if (!text.trim() || !pendingAudio) return;
    await window.__storage.addWord(listId, {
      text: text.trim(),
      audioBlob: pendingAudio.blob,
      audioMime: pendingAudio.mime,
    });
    setText("");
    setPendingAudio(null);
    refresh();
  }

  async function removeWord(wordId) {
    await window.__storage.deleteWord(listId, wordId);
    refresh();
  }

  async function move(index, dir) {
    const order = words.map((w) => w.id);
    const j = index + dir;
    if (j < 0 || j >= order.length) return;
    [order[index], order[j]] = [order[j], order[index]];
    await window.__storage.reorderWords(listId, order);
    refresh();
  }

  function playPending() {
    if (!pendingAudio) return;
    new Audio(URL.createObjectURL(pendingAudio.blob)).play().catch(() => {});
  }

  function playWord(word) {
    if (!word.audioBlob) return;
    new Audio(URL.createObjectURL(word.audioBlob)).play().catch(() => {});
  }

  if (!list) return null;

  return (
    <div className="min-h-screen p-6">
      <h2 className="mb-4 text-3xl font-bold text-slate-700">{list.name}</h2>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Word, phrase, or character"
          className="rounded-xl border px-4 py-2"
        />
        <button
          type="button"
          onClick={toggleRecord}
          className={`rounded-xl px-4 py-2 font-semibold text-white ${recording ? "bg-rose-500" : "bg-sky-500"}`}
        >
          {recording ? "Stop recording" : "Record"}
        </button>
        {recordError && <p className="text-sm text-rose-600">{recordError}</p>}
        {pendingAudio && (
          <button
            type="button"
            onClick={playPending}
            className="rounded-xl bg-slate-200 px-4 py-2"
          >
            Play preview
          </button>
        )}
        <button
          type="button"
          onClick={addWord}
          disabled={!text.trim() || !pendingAudio}
          className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white disabled:opacity-40"
        >
          Add word
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {words.map((word, i) => (
          <li
            key={word.id}
            className="flex items-center justify-between gap-3 rounded-xl bg-white p-3 shadow"
          >
            <span className="text-lg">{word.text}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => playWord(word)}
                className="rounded-lg bg-slate-200 px-3 py-1"
              >
                Play
              </button>
              <button
                type="button"
                onClick={() => move(i, -1)}
                className="rounded-lg bg-slate-200 px-3 py-1"
              >
                Up
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                className="rounded-lg bg-slate-200 px-3 py-1"
              >
                Down
              </button>
              <button
                type="button"
                onClick={() => removeWord(word.id)}
                className="rounded-lg bg-rose-200 px-3 py-1"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "manage" })}
        className="mt-8 text-slate-500 underline"
      >
        Back to lists
      </button>
    </div>
  );
}
