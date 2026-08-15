import { useEffect, useState } from "react";

export default function Celebration({ listId, onNavigate }) {
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    window.__audio.playFanfare();
    (async () => {
      const words = await window.__storage.getWords(listId);
      setWordCount(words.length);
    })();
  }, [listId]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-7xl">{"⭐️🎉⭐️"}</p>
      <h2 className="text-4xl font-bold text-emerald-600">
        You finished the whole list, Chloe!
      </h2>

      {wordCount > 0 && (
        <div className="flex items-center justify-center gap-1">
          {Array.from({ length: wordCount }).map((_, i) => (
            <span
              key={i}
              className="tick-pop text-4xl text-amber-400"
              style={{ animationDelay: `${i * 0.08}s` }}
            >
              ★
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="rounded-2xl bg-emerald-500 px-8 py-4 text-xl font-bold text-white transition active:scale-95"
        >
          Practise Again
        </button>
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="rounded-2xl bg-slate-300 px-8 py-4 text-xl font-bold text-slate-700 transition active:scale-95"
        >
          Home
        </button>
      </div>
    </div>
  );
}
