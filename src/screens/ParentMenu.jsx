import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";

export default function ParentMenu({ onNavigate }) {
  return (
    <Screen max="max-w-2xl">
      {/* Back moved from the bottom of the stack into the standard header,
          so every screen in the app now dismisses from the same place. */}
      <PageHeader title="Parents" onBack={() => onNavigate("home")} />
      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "manage" })}
          className="btn btn-primary btn-lg w-full max-w-sm"
        >
          Manage Spelling Lists
        </button>
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "review" })}
          className="btn btn-lg w-full max-w-sm bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500"
        >
          Review Chloe's Work
        </button>
      </div>
    </Screen>
  );
}
