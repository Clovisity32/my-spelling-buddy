import { useEffect, useState } from "react";
import StrokeReplay from "../canvas/StrokeReplay.jsx";

export default function Review({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [rows, setRows] = useState([]);

  async function refresh() {
    const l = await window.__storage.getList(listId);
    setList(l);
    const words = await window.__storage.getWords(listId);
    const marks = await window.__storage.getMarksForList(listId);
    const built = [];
    for (const w of words) {
      const strokes = await window.__storage.getAttempt(listId, w.id);
      built.push({ word: w, strokes: strokes || [], ticked: !!marks[w.id] });
    }
    setRows(built);
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  async function tick(wordId) {
    await window.__storage.setMark(listId, wordId, true);
    await window.__audio.playHappyTick();
    refresh();
  }

  function playAudio(word) {
    if (!word.audioBlob) return;
    new Audio(URL.createObjectURL(word.audioBlob)).play().catch(() => {});
  }

  if (!list) return null;

  return (
    <div className="min-h-screen p-6">
      <h2 className="mb-6 text-3xl font-bold text-slate-700">
        Reviewing: {list.name}
      </h2>
      <div className="flex flex-col gap-6">
        {rows.map(({ word, strokes, ticked }) => (
          <div
            key={word.id}
            className="relative rounded-2xl bg-white p-4 shadow"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-2xl font-semibold">{word.text}</span>
              <button
                type="button"
                onClick={() => playAudio(word)}
                className="rounded-lg bg-slate-200 px-4 py-2"
              >
                Play
              </button>
            </div>
            <StrokeReplay strokes={strokes} />
            <button
              type="button"
              onClick={() => tick(word.id)}
              className="mt-3 rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white"
            >
              Mark correct
            </button>
            {ticked && (
              <span
                role="img"
                aria-label="Marked correct"
                className="pointer-events-none absolute right-6 top-6 text-6xl text-emerald-500"
              >
                {"✓"}
              </span>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "review" })}
        className="mt-8 text-slate-500 underline"
      >
        Back to lists
      </button>
    </div>
  );
}
