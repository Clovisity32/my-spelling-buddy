import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";
import { getJustEarnedSticker } from "../stickers.js";

function ordinal(n) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

// This screen fires right after Test finishes — before any marking has
// happened in Review. So it can't say anything about accuracy yet ("2 more
// than last time" lives on SessionHistory, where marks actually exist).
// Everything here is effort: she showed up and finished, which is always
// true regardless of how the spelling went.
export default function Celebration({ listId, sessionId, onNavigate }) {
  const [wordCount, setWordCount] = useState(0);
  const [childName, setChildName] = useState("");
  const [streak, setStreak] = useState(0);
  const [practiceNumber, setPracticeNumber] = useState(1);
  const [newSticker, setNewSticker] = useState(null);

  useEffect(() => {
    window.__audio.playFanfare();
    (async () => {
      const words = await window.__storage.getWords(listId);
      setWordCount(words.length);
      setChildName(await window.__storage.getChildName());
      setStreak(await window.__storage.getPracticeStreak());
      const sessions = await window.__storage.getSessions(listId);
      setPracticeNumber(sessions.length);
      const total = await window.__storage.getTotalCompletedSessionCount();
      setNewSticker(getJustEarnedSticker(total));
    })();
  }, [listId, sessionId]);

  return (
    <Screen centered max="max-w-2xl">
      <p className="text-6xl sm:text-7xl">{"⭐️🎉⭐️"}</p>
      <h2 className="text-3xl font-bold tracking-tight text-emerald-600 sm:text-4xl">
        You finished the whole list, {childName}!
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

      <div className="card w-full max-w-md">
        <p className="text-5xl">🦉</p>
        <p className="mt-2 text-lg font-semibold text-slate-700">
          {practiceNumber > 1
            ? `This is the ${ordinal(practiceNumber)} time you've practised this list — showing up is what counts!`
            : "Every practice makes you stronger — great job showing up!"}
        </p>
        {streak > 1 && (
          <p className="mt-2 text-sm font-semibold text-amber-600">
            🔥 {streak}-day practice streak!
          </p>
        )}
        {newSticker && (
          <p className="mt-3 text-base text-violet-600">
            You earned a new sticker:{" "}
            <span className="text-2xl">{newSticker.emoji}</span>{" "}
            {newSticker.label}
          </p>
        )}
      </div>

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
