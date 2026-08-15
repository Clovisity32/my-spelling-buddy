export default function ParentMenu({ onNavigate }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-6 overflow-hidden p-6">
      <h2 className="text-3xl font-bold text-slate-700">Parents</h2>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "manage" })}
        className="w-72 rounded-2xl bg-sky-400 px-8 py-6 text-xl font-semibold text-white shadow transition active:scale-95"
      >
        Manage Spelling Lists
      </button>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "review" })}
        className="w-72 rounded-2xl bg-amber-400 px-8 py-6 text-xl font-semibold text-white shadow transition active:scale-95"
      >
        Review Chloe's Work
      </button>
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="rounded-2xl bg-slate-200 px-6 py-3 text-lg font-semibold text-slate-600 transition active:scale-95"
      >
        Back
      </button>
    </div>
  );
}
