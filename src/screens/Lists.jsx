import { useEffect, useState } from "react";

export default function Lists({ mode, onNavigate }) {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState("");
  const [markSummary, setMarkSummary] = useState({}); // listId -> {marked, total}

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
    <div className="min-h-screen p-6">
      <h2 className="mb-4 text-3xl font-bold text-slate-700">{title}</h2>
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
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => selectList(list)}
            className="rounded-2xl bg-white p-6 text-left shadow transition active:scale-95 hover:shadow-md"
          >
            <div className="text-xl font-semibold">{list.name}</div>
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
        ))}
      </div>
      <button
        type="button"
        onClick={() => onNavigate(mode === "practice" ? "home" : "parentMenu")}
        className="mt-8 rounded-2xl bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-600 transition active:scale-95 hover:bg-slate-300"
      >
        Back
      </button>
    </div>
  );
}
