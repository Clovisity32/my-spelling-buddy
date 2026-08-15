import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";

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
    <Screen centered max="max-w-2xl">
      <h1 className="t-hero">My Spelling Buddy</h1>

      {latestList && (
        <div className="card w-full text-left">
          <p className="t-label mb-2">Latest list: {latestList.name}</p>
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

      <div className="flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="btn btn-go btn-hero flex-1 sm:max-w-xs"
        >
          Practise
        </button>
        <button
          type="button"
          onClick={() => onNavigate("parentMenu")}
          className="btn btn-secondary btn-hero flex-1 text-xl sm:max-w-[12rem]"
        >
          Parents
        </button>
      </div>
    </Screen>
  );
}
