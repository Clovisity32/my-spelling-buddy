import { useEffect, useState } from "react";
import StrokeReplay from "../canvas/StrokeReplay.jsx";

export default function Review({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [rows, setRows] = useState([]);
  // Transient — drives the brief celebratory pop/pulse. Separate from the
  // persisted "ticked" mark so marking many words in a row doesn't leave a
  // page full of permanently-pulsing badges (the pulse used to be
  // `animate-ping`'s default `infinite`, which never actually stopped).
  const [justTickedId, setJustTickedId] = useState(null);

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

  // Mark correct is a toggle: tapping an already-ticked word un-marks it,
  // so a mis-tap doesn't require the full Redo round-trip to undo.
  async function toggleTick(wordId, currentlyTicked) {
    await window.__storage.setMark(listId, wordId, !currentlyTicked);
    if (!currentlyTicked) {
      window.__audio.playHappyTick();
      setJustTickedId(wordId);
      setTimeout(
        () => setJustTickedId((id) => (id === wordId ? null : id)),
        900,
      );
    }
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

  const markedCount = rows.filter((r) => r.ticked).length;

  return (
    <div className="min-h-screen p-6">
      <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-3xl font-bold text-slate-700">
          Reviewing: {list.name}
        </h2>
        {rows.length > 0 && (
          <p className="text-lg font-semibold text-slate-500">
            {markedCount} of {rows.length} marked
          </p>
        )}
      </div>
      <div className="flex flex-col gap-6">
        {rows.map(({ word, strokes, ticked }) => {
          const attempted = strokes.length > 0;
          return (
            <div
              key={word.id}
              className="relative rounded-2xl bg-white p-4 shadow"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-2xl font-semibold">
                  {word.text}
                  {ticked && (
                    <span
                      role="img"
                      aria-label="Marked correct"
                      className={`text-emerald-500 ${justTickedId === word.id ? "tick-pop" : ""}`}
                    >
                      ✓
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => playAudio(word)}
                  className="rounded-lg bg-slate-200 px-4 py-2 transition active:scale-95 hover:bg-slate-300"
                >
                  Play
                </button>
              </div>

              {attempted ? (
                <StrokeReplay strokes={strokes} />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-slate-400">
                  Not attempted yet
                </p>
              )}

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => toggleTick(word.id, ticked)}
                  disabled={!attempted}
                  aria-pressed={ticked}
                  className={`rounded-xl px-4 py-2 font-semibold text-white transition active:scale-95 disabled:opacity-40 ${
                    ticked
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-emerald-500 hover:bg-emerald-600"
                  }`}
                >
                  {ticked ? "✓ Correct" : "Mark correct"}
                </button>
                <button
                  type="button"
                  onClick={() => redo(word.id)}
                  disabled={!attempted}
                  title="Not correct — send back to hear it and write it again"
                  className="rounded-xl bg-amber-400 px-4 py-2 font-semibold text-white transition active:scale-95 hover:bg-amber-500 disabled:opacity-40"
                >
                  Redo
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "review" })}
        className="mt-8 rounded-2xl bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-600 transition active:scale-95 hover:bg-slate-300"
      >
        Back to lists
      </button>
    </div>
  );
}
