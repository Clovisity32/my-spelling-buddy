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
  // Delete is undoable, same pattern as deleting a list or a word: hide it
  // immediately, only actually remove it (and its attempts and marks — see
  // storage/index.js's deleteSession) after a few seconds with no Undo.
  const [pendingDelete, setPendingDelete] = useState(null); // {session, timerId}

  async function refresh() {
    setList(await window.__storage.getList(listId));
    setSessions(await window.__storage.getSessionStats(listId));
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  function requestDeleteSession(session) {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timerId);
      window.__storage.deleteSession(pendingDelete.session.id);
    }
    setSessions((ss) => ss.filter((s) => s.id !== session.id));
    const timerId = setTimeout(() => {
      window.__storage.deleteSession(session.id);
      setPendingDelete(null);
    }, 4000);
    setPendingDelete({ session, timerId });
  }

  function undoDeleteSession() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timerId);
    setPendingDelete(null);
    refresh();
  }

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
                <div key={s.id} className="card relative p-0">
                  <button
                    type="button"
                    onClick={() => onNavigate("review", { sessionId: s.id })}
                    className="flex w-full items-center justify-between gap-3 rounded-2xl p-5 pr-24 text-left transition hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
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
                        {diff > 0
                          ? `+${diff} more than last time`
                          : "keep going"}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => requestDeleteSession(s)}
                    className="btn btn-danger btn-sm absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {pendingDelete && (
        <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-800 px-5 py-3 text-white shadow-lg">
          <span>
            Deleted the {formatDate(pendingDelete.session.startedAt)} practice
          </span>
          <button
            type="button"
            onClick={undoDeleteSession}
            className="font-semibold text-sky-300 underline"
          >
            Undo
          </button>
        </div>
      )}
    </Screen>
  );
}
