// One header for every non-hero screen, replacing four different wrapper
// recipes (mb-3/mb-4/mb-6, items-center/items-baseline, gap-2/gap-3) and
// three different Back-button treatments.
//
// shrink-0 matters: the header must never be squeezed by a flex sibling
// that wants more room, which is how content started disappearing off the
// top of the practice screen.
export default function PageHeader({
  title,
  // Rendered to the right of the title, before Back (counts, toggles…).
  actions = null,
  onBack = null,
  backLabel = "Back",
  // The practice screen needs a quieter, shorter header so the canvas keeps
  // as much vertical room as possible.
  compact = false,
}) {
  return (
    <header
      className={`flex shrink-0 flex-wrap items-center justify-between gap-3 ${
        compact ? "mb-3" : "mb-5"
      }`}
    >
      <h1
        className={
          compact
            ? "min-w-0 truncate text-lg font-semibold text-slate-500"
            : "t-page min-w-0 truncate"
        }
      >
        {title}
      </h1>
      {(actions || onBack) && (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className={`btn btn-secondary${compact ? " btn-sm" : ""}`}
            >
              {backLabel}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
