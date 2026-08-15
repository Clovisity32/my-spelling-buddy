import { useEffect, useState } from "react";

export default function Lists({ mode, onNavigate }) {
  const [lists, setLists] = useState([]);
  const [newName, setNewName] = useState("");
  const [selected, setSelected] = useState(null);
  const [shuffle, setShuffle] = useState(false);

  async function refresh() {
    setLists(await window.__storage.getLists());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function createList() {
    if (!newName.trim()) return;
    await window.__storage.createList(newName.trim());
    setNewName("");
    refresh();
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
            className="rounded-xl bg-sky-400 px-4 py-2 font-semibold text-white"
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
            onClick={() => {
              if (mode === "manage") onNavigate("editor", { listId: list.id });
              else if (mode === "review")
                onNavigate("review", { listId: list.id });
              else setSelected(list.id);
            }}
            className={`rounded-2xl p-6 text-left shadow ${selected === list.id ? "bg-emerald-100" : "bg-white"}`}
          >
            <div className="text-xl font-semibold">{list.name}</div>
            <div className="text-sm text-slate-500">
              {list.wordOrder.length} words
            </div>
          </button>
        ))}
      </div>
      {mode === "practice" && selected && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl bg-white p-6 shadow">
          <label className="flex items-center gap-2 text-lg">
            <input
              type="checkbox"
              checked={shuffle}
              onChange={(e) => setShuffle(e.target.checked)}
            />
            Shuffle the words
          </label>
          <button
            type="button"
            onClick={() => onNavigate("test", { listId: selected, shuffle })}
            className="rounded-2xl bg-emerald-400 px-8 py-4 text-xl font-bold text-white"
          >
            Start!
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => onNavigate(mode === "practice" ? "home" : "parentMenu")}
        className="mt-8 text-slate-500 underline"
      >
        Back
      </button>
    </div>
  );
}
