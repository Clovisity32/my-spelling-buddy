import { useEffect, useState } from "react";

export default function Lists({ mode, onNavigate }) {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState("");
  const [markSummary, setMarkSummary] = useState({}); // listId -> {marked, total}
  const [pendingDelete, setPendingDelete] = useState(null); // {list, timerId}

  async function refresh() {
    const loaded = await window.__storage.getLists();
    setLists(loaded);
    if (mode === "review") {
      const summary = {};
      for (const list of loaded) {
        const marks = await window.__storage.getMarksForList(list.id);
        const values = Object.values(marks);
        summary[list.id] = {
          marked: values.filter(Boolean).length,
          total: values.length,
        };
      }
      setMarkSummary(summary);
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
  // recordings, and marks — see storage/index.js's deleteList) after a few
  // seconds with no Undo.
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

  function selectList(list) {
    if (mode === "manage") onNavigate("editor", { listId: list.id });
    else if (mode === "review") onNavigate("review", { listId: list.id });
    // Practice mode starts the list immediately, using the shuffle
    // preference the parent already set for it in the list editor — no
    // intermediate checkbox-then-Start screen for Chloe to work through.
    else onNavigate("test", { listId: list.id, shuffle: !!list.shuffle });
  }

  const title = {
    practice: "Pick a list to practise",
    manage: "Manage lists",
    review: "Review a list",
  }[mode];

  return (
    <div className="flex h-screen flex-col overflow-hidden p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl font-bold text-slate-700">{title}</h2>
        <button
          type="button"
          onClick={() =>
            onNavigate(mode === "practice" ? "home" : "parentMenu")
          }
          className="rounded-2xl bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-600 transition active:scale-95 hover:bg-slate-300"
        >
          Back
        </button>
      </div>
      {mode === "manage" && (
        <div className="mb-6 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New list name"
            className="rounded-xl border px-4 py-2"
          />
          <button
            type="button"
            onClick={createList}
            className="rounded-xl bg-sky-400 px-4 py-2 font-semibold text-white transition active:scale-95"
          >
            Add list
          </button>
        </div>
      )}
      <div className="grid flex-1 auto-rows-min grid-cols-1 gap-4 overflow-hidden sm:grid-cols-2 md:grid-cols-3">
        {lists.map((list) => (
          <div
            key={list.id}
            className="relative rounded-2xl bg-white shadow transition hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => selectList(list)}
              className="block w-full p-6 text-left active:scale-95"
            >
              <div className="pr-16 text-xl font-semibold">{list.name}</div>
              <div className="text-sm text-slate-500">
                {list.wordOrder.length} words
                {mode === "review" && markSummary[list.id] && (
                  <>
                    {" "}
                    · {markSummary[list.id].marked} of{" "}
                    {markSummary[list.id].total} marked
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
                className="absolute right-3 top-3 rounded-lg bg-rose-200 px-3 py-1 text-sm font-semibold text-rose-700 transition active:scale-95 hover:bg-rose-300"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>

      {pendingDelete && (
        <div className="fixed bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-slate-800 px-5 py-3 text-white shadow-lg">
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
    </div>
  );
}
