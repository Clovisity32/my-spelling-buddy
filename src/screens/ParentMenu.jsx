export default function ParentMenu({ onNavigate }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h2 className="text-3xl font-bold text-slate-700">Parents</h2>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "manage" })}
        className="w-72 rounded-2xl bg-sky-400 px-8 py-6 text-xl font-semibold text-white shadow"
      >
        Manage Spelling Lists
      </button>
      <button
        type="button"
        onClick={() => onNavigate("lists", { mode: "review" })}
        className="w-72 rounded-2xl bg-amber-400 px-8 py-6 text-xl font-semibold text-white shadow"
      >
        Review Chloe's Work
      </button>
      <button
        type="button"
        onClick={() => onNavigate("home")}
        className="text-slate-500 underline"
      >
        Back
      </button>
    </div>
  );
}
