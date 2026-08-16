import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";

export default function Home({ onNavigate }) {
  const [latestList, setLatestList] = useState(null);
  const [latestWords, setLatestWords] = useState([]);
  const [stickersEnabled, setStickersEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      const lists = await window.__storage.getLists(); // newest first
      if (lists.length === 0) return;
      setLatestList(lists[0]);
      setLatestWords(await window.__storage.getWords(lists[0].id));
    })();
    (async () =>
      setStickersEnabled(await window.__storage.getStickersEnabled()))();
  }, []);

  function playWord(word) {
    window.__audio.playWordEntry(word);
  }

  return (
    <Screen centered max="max-w-2xl">
      <h1 className="t-hero">My Spelling Buddy</h1>

      {latestList && (
        <div className="card w-full text-left">
          <p className="t-label mb-2">Latest list: {latestList.name}</p>
          {latestWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {latestWords.map((word) => (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => playWord(word)}
                  aria-label={`Say "${word.text}"`}
                  className="flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 transition active:scale-95 hover:bg-sky-200"
                >
                  <span aria-hidden="true">🔊</span>
                  {word.text}
                </button>
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

      {stickersEnabled && (
        <button
          type="button"
          onClick={() => onNavigate("stickers")}
          className="btn btn-secondary btn-sm"
        >
          🎖️ My Stickers
        </button>
      )}
    </Screen>
  );
}
