import { useEffect } from "react";

export default function Celebration({ onNavigate }) {
  useEffect(() => {
    window.__audio.playFanfare();
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
      <p className="text-6xl">{"⭐️🎉⭐️"}</p>
      <h2 className="text-4xl font-bold text-emerald-600">
        You finished the whole list, Chloe!
      </h2>
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="rounded-2xl bg-emerald-500 px-8 py-4 text-xl font-bold text-white"
        >
          Practise Again
        </button>
        <button
          type="button"
          onClick={() => onNavigate("home")}
          className="rounded-2xl bg-slate-300 px-8 py-4 text-xl font-bold text-slate-700"
        >
          Home
        </button>
      </div>
    </div>
  );
}
