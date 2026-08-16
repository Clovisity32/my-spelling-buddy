import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { STICKERS, getEarnedStickers } from "../stickers.js";

export default function Stickers({ onNavigate }) {
  const [total, setTotal] = useState(0);

  useEffect(() => {
    (async () =>
      setTotal(await window.__storage.getTotalCompletedSessionCount()))();
  }, []);

  const earned = new Set(getEarnedStickers(total).map((s) => s.threshold));

  return (
    <Screen max="max-w-2xl">
      <PageHeader title="My Stickers" onBack={() => onNavigate("home")} />
      <p className="mb-4 text-sm text-slate-500">
        Earned just for practising, no matter how it goes — {total} practice
        {total === 1 ? "" : "s"} completed so far.
      </p>
      <div className="grid flex-1 grid-cols-3 gap-4 overflow-y-auto pb-1 sm:grid-cols-4">
        {STICKERS.map((s) => {
          const isEarned = earned.has(s.threshold);
          return (
            <div
              key={s.threshold}
              className={`card flex flex-col items-center gap-1 p-4 text-center ${isEarned ? "" : "opacity-40 grayscale"}`}
            >
              <span className="text-4xl">{isEarned ? s.emoji : "❔"}</span>
              <span className="text-xs font-semibold text-slate-600">
                {isEarned ? s.label : `Practise ${s.threshold} times`}
              </span>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
