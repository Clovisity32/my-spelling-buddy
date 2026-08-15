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

  // Not correct — clear any existing mark (the attempt about to be redone
  // makes the old mark stale either way) and send the student back to the
  // usual practice screen for just this one word. Test.jsx returns here
  // (rather than to Celebration) once they've heard it, written it again,
  // and saved.
  async function redo(wordId) {
    await window.__storage.setMark(listId, wordId, false);
    onNavigate("test", { listId, wordId, returnTo: "review" });
  }

  function playAudio(word) {
    if (word.useTts)
      window.__audio.speakWord(word.text, word.ttsLang, word.ttsVoiceURI);
    else if (word.audioBlob) window.__audio.playRecordedAudio(word.audioBlob);
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
                className="rounded-lg bg-slate-200 px-4 py-2 transition active:scale-95"
              >
                Play
              </button>
            </div>
            <StrokeReplay strokes={strokes} />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => tick(word.id)}
                className="rounded-xl bg-emerald-500 px-4 py-2 font-semibold text-white transition active:scale-95"
              >
                Mark correct
              </button>
              <button
                type="button"
                onClick={() => redo(word.id)}
                title="Not correct — send back to hear it and write it again"
                className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-white transition active:scale-95"
              >
                Redo
              </button>
            </div>
            {ticked && (
              <div
                role="img"
                aria-label="Marked correct"
                className="pointer-events-none absolute -right-4 -top-4 sm:-right-6 sm:-top-6"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <div className="tick-pop relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-5xl text-white shadow-xl sm:h-28 sm:w-28 sm:text-7xl">
                  {"✓"}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "review" })}
        className="mt-8 rounded-2xl bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-600 transition active:scale-95"
      >
        Back to lists
      </button>
    </div>
  );
}
