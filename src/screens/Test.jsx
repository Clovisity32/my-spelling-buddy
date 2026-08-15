import { useEffect, useRef, useState } from "react";
import Whiteboard from "../canvas/Whiteboard.jsx";
import { getRandomPraise } from "../praise.js";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Test({ listId, shuffle, onNavigate }) {
  const [words, setWords] = useState(null);
  const [index, setIndex] = useState(0);
  const [praise, setPraise] = useState(null);
  const [fingerDraw, setFingerDraw] = useState(false);
  const wbRef = useRef(null);

  useEffect(() => {
    (async () => {
      const loaded = await window.__storage.getWords(listId);
      setWords(shuffle ? shuffleArray(loaded) : loaded);
    })();
  }, [listId, shuffle]);

  if (!words) return null;
  if (words.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center">
          <p className="text-xl">
            This list has no words yet — ask a parent to add some!
          </p>
          <button
            type="button"
            onClick={() => onNavigate("home")}
            className="mt-4 rounded-xl bg-slate-300 px-6 py-3 font-semibold text-slate-700"
          >
            Home
          </button>
        </div>
      </div>
    );
  }

  const word = words[index];

  function playWord() {
    if (!word.audioBlob) return;
    new Audio(URL.createObjectURL(word.audioBlob)).play().catch(() => {});
  }

  async function save() {
    const strokes = wbRef.current.getStrokes();
    await window.__storage.putAttempt(listId, word.id, strokes);
    await window.__audio.playSaveChime();
    setPraise(getRandomPraise());
  }

  function next() {
    setPraise(null);
    if (index + 1 >= words.length) {
      onNavigate("celebration", { listId });
    } else {
      setIndex(index + 1);
    }
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {words.map((_, i) => (
            <span
              key={i}
              className={`text-2xl ${i <= index ? "text-amber-400" : "text-slate-200"}`}
            >
              {"★"}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="text-sm text-slate-400 underline"
        >
          Home
        </button>
      </div>

      <button
        type="button"
        onClick={playWord}
        aria-label="Play the word"
        className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-400 text-4xl text-white shadow-lg active:scale-95"
      >
        {"▶"}
      </button>

      <div className="min-h-0 flex-1">
        <Whiteboard
          key={word.id}
          ref={wbRef}
          fingerDraw={fingerDraw}
          onFingerDrawChange={setFingerDraw}
        />
      </div>

      {!praise ? (
        <button
          type="button"
          onClick={save}
          className="mt-4 rounded-2xl bg-sky-500 px-8 py-4 text-2xl font-bold text-white shadow"
        >
          Save
        </button>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow">
          <p className="text-2xl font-bold text-emerald-600">{praise}</p>
          <button
            type="button"
            onClick={next}
            className="rounded-2xl bg-emerald-500 px-8 py-4 text-xl font-bold text-white"
          >
            Next word
          </button>
        </div>
      )}
    </div>
  );
}
