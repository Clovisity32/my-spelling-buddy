import { useEffect, useState } from "react";

export default function Home({ onNavigate }) {
  const [latestList, setLatestList] = useState(null);
  const [latestWords, setLatestWords] = useState([]);

  useEffect(() => {
    (async () => {
      const lists = await window.__storage.getLists(); // newest first
      if (lists.length === 0) return;
      setLatestList(lists[0]);
      setLatestWords(await window.__storage.getWords(lists[0].id));
    })();
  }, []);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 overflow-hidden p-6">
      <h1 className="text-5xl font-bold text-slate-700">My Spelling Buddy</h1>

      {latestList && (
        <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-lg">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Latest list: {latestList.name}
          </p>
          {latestWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {latestWords.map((word) => (
                <span
                  key={word.id}
                  className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700"
                >
                  {word.text}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No words added yet.</p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6 sm:flex-row">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="rounded-3xl bg-emerald-400 px-16 py-10 text-3xl font-bold text-white shadow-lg transition active:scale-95"
        >
          Practise
        </button>
        <button
          type="button"
          onClick={() => onNavigate("parentMenu")}
          className="rounded-3xl bg-slate-300 px-16 py-10 text-2xl font-semibold text-slate-700 shadow-lg transition active:scale-95"
        >
          Parents
        </button>
      </div>
    </div>
  );
}
