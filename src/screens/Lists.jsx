import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";

export default function Lists({ mode, onNavigate }) {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState("");
  const [sessionSummary, setSessionSummary] = useState({}); // listId -> {count}
  const [pendingDelete, setPendingDelete] = useState(null); // {list, timerId}

  async function refresh() {
    const loaded = await window.__storage.getLists();
    setLists(loaded);
    if (mode === "review") {
      const summary = {};
      for (const list of loaded) {
        const sessions = await window.__storage.getCompletedSessions(list.id);
        summary[list.id] = { count: sessions.length };
      }
      setSessionSummary(summary);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  async function createList() {
    if (!newName.trim()) return;
    await window.__storage.createList(newName.trim());
    setNewName("");
    refresh();
  }

  // Delete is undoable, same pattern as deleting a word in the list
  // editor: hide it immediately, only actually remove it (and its words,
  // practice sessions, and marks — see storage/index.js's deleteList) after
  // a few seconds with no Undo.
  function requestDeleteList(list) {
    if (pendingDelete) {
      clearTimeout(pendingDelete.timerId);
      window.__storage.deleteList(pendingDelete.list.id);
    }
    setLists((ls) => ls.filter((l) => l.id !== list.id));
    const timerId = setTimeout(() => {
      window.__storage.deleteList(list.id);
      setPendingDelete(null);
    }, 4000);
    setPendingDelete({ list, timerId });
  }

  function undoDeleteList() {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timerId);
    setPendingDelete(null);
    refresh();
  }

  async function selectList(list) {
    if (mode === "manage") onNavigate("editor", { listId: list.id });
    // Review opens the list's practice history first, rather than jumping
    // straight into marking the newest session — a parent catching up on a
    // few days of practice needs to pick which session they're looking at.
    else if (mode === "review")
      onNavigate("sessionHistory", { listId: list.id });
    else {
      // Practice mode starts a new session immediately, using the shuffle
      // preference the parent already set for it in the list editor — no
      // intermediate checkbox-then-Start screen for Chloe to work through.
      const session = await window.__storage.startSession(list.id);
      onNavigate("test", {
        listId: list.id,
        sessionId: session.id,
        shuffle: !!list.shuffle,
      });
    }
  }

  const title = {
    practice: "Pick a list to practise",
    manage: "Manage lists",
    review: "Review a list",
  }[mode];

  return (
    <Screen>
      <PageHeader
        title={title}
        onBack={() => onNavigate(mode === "practice" ? "home" : "parentMenu")}
      />
      {mode === "manage" && (
        <div className="mb-5 flex shrink-0 flex-wrap gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New list name"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2 sm:max-w-xs"
          />
          <button
            type="button"
            onClick={createList}
            className="btn btn-primary btn-sm"
          >
            Add list
          </button>
        </div>
      )}
      {/* The list grid is the one part of this screen allowed to scroll if a
          parent accumulates more lists than fit — the header and the add-list
          row stay put above it. */}
      <div className="grid flex-1 auto-rows-min grid-cols-1 gap-4 overflow-y-auto pb-1 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => (
          <div
            key={list.id}
            className="card relative p-0 transition hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => selectList(list)}
              className="block w-full rounded-2xl p-5 text-left transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            >
              <div className="truncate pr-20 text-lg font-semibold text-slate-800">
                {list.name}
              </div>
              <div className="mt-0.5 text-sm text-slate-500">
                {list.wordOrder.length} words
                {mode === "review" && sessionSummary[list.id] && (
                  <>
                    {" "}
                    ·{" "}
                    {sessionSummary[list.id].count > 0
                      ? `practised ${sessionSummary[list.id].count} time${sessionSummary[list.id].count === 1 ? "" : "s"}`
                      : "not practised yet"}
                  </>
                )}
              </div>
            </button>
            {mode === "manage" && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  requestDeleteList(list);
                }}
                className="btn btn-danger btn-sm absolute right-3 top-3"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {pendingDelete && (
        <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-800 px-5 py-3 text-white shadow-lg">
          <span>Deleted "{pendingDelete.list.name}"</span>
          <button
            type="button"
            onClick={undoDeleteList}
            className="font-semibold text-sky-300 underline"
          >
            Undo
          </button>
        </div>
      )}
    </Screen>
  );
}
