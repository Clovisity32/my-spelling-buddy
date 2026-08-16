import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// A per-list practice history: one row per session, newest first, so a
// parent picks which session to mark rather than always landing on the
// latest one. This is also where "progress over score" lives — comparisons
// only make sense once a session has actually been marked, which happens
// here, not at Celebration (which fires before any marking has happened).
export default function SessionHistory({ listId, onNavigate }) {
  const [list, setList] = useState(null);
  const [sessions, setSessions] = useState([]);

  async function refresh() {
    setList(await window.__storage.getList(listId));
    setSessions(await window.__storage.getSessionStats(listId));
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  if (!list) return null;

  const best = sessions.length ? Math.max(...sessions.map((s) => s.gotIt)) : 0;

  return (
    <Screen max="max-w-2xl">
      <PageHeader
        title={`${list.name} — practice history`}
        onBack={() => onNavigate("lists", { mode: "review" })}
        backLabel="Back to lists"
      />
      {sessions.length === 0 ? (
        <p className="text-slate-400">No practice sessions yet.</p>
      ) : (
        <>
          {best > 0 && (
            <p className="mb-4 text-sm font-semibold text-amber-600">
              🏆 Personal best: {best} got it in one go
            </p>
          )}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto pb-1">
            {sessions.map((s, i) => {
              const prev = sessions[i + 1];
              const diff = prev ? s.gotIt - prev.gotIt : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onNavigate("review", { sessionId: s.id })}
                  className="card flex items-center justify-between gap-3 text-left transition hover:shadow-md active:scale-[0.98]"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {formatDate(s.startedAt)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {s.gotIt} got it
                      {s.wordCount
                        ? ` · ${s.wordCount} word${s.wordCount === 1 ? "" : "s"}`
                        : ""}
                    </p>
                  </div>
                  {diff !== null && diff !== 0 && (
                    <span
                      className={`text-sm font-semibold ${diff > 0 ? "text-emerald-600" : "text-slate-400"}`}
                    >
                      {diff > 0 ? `+${diff} more than last time` : "keep going"}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Screen>
  );
}
