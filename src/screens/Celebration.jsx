import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";

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
    <Screen centered max="max-w-2xl">
      <p className="text-6xl sm:text-7xl">{"⭐️🎉⭐️"}</p>
      <h2 className="text-3xl font-bold tracking-tight text-emerald-600 sm:text-4xl">
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

      <div className="flex flex-col gap-4 sm:flex-row">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="btn btn-go btn-lg"
        >
          Practise Again
        </button>
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="btn btn-secondary btn-lg"
        >
          Home
        </button>
      </div>
    </Screen>
  );
}
