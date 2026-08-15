export default function Home({ onNavigate }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-5xl font-bold text-slate-700">My Spelling Buddy</h1>
      <div className="flex flex-col gap-6 sm:flex-row">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="rounded-3xl bg-emerald-400 px-16 py-10 text-3xl font-bold text-white shadow-lg active:scale-95"
        >
          Practise
        </button>
        <button
          type="button"
          onClick={() => onNavigate("parentMenu")}
          className="rounded-3xl bg-slate-300 px-16 py-10 text-2xl font-semibold text-slate-700 shadow-lg active:scale-95"
        >
          Parents
        </button>
      </div>
    </div>
  );
}
