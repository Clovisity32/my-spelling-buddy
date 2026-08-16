import { useEffect, useRef, useState } from "react";
import StrokeReplay from "../canvas/StrokeReplay.jsx";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";

export default function Review({ sessionId, focusWordId, onNavigate }) {
  const [session, setSession] = useState(null);
  const [list, setList] = useState(null);
  const [rows, setRows] = useState([]);
  // Transient — drives the brief celebratory pop. Separate from the
  // persisted "state" so marking many words in a row doesn't leave a page
  // full of permanently-pulsing badges (the pulse used to be
  // `animate-ping`'s default `infinite`, which never actually stopped).
  const [justMarkedId, setJustMarkedId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const cardRefs = useRef({});

  async function refresh() {
    const s = await window.__storage.getSession(sessionId);
    setSession(s);
    if (!s) return;
    const l = await window.__storage.getList(s.listId);
    setList(l);
    const words = await window.__storage.getWords(s.listId);
    const marks = await window.__storage.getMarksForSession(sessionId);
    const attempts = await window.__storage.getAttemptsForSession(sessionId);
    const built = words.map((w) => ({
      word: w,
      strokes: attempts[w.id] || [],
      state: marks[w.id] || null, // 'gotIt' | 'notYet' | null
    }));
    setRows(built);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Coming back from a redo lands on a specific word rather than the top of
  // a potentially long, fully re-scrolled list — a parent redoing several
  // words in a row otherwise pays a full re-scroll every single time.
  useEffect(() => {
    if (!focusWordId || rows.length === 0) return;
    const el = cardRefs.current[focusWordId];
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(focusWordId);
    const t = setTimeout(
      () => setHighlightId((id) => (id === focusWordId ? null : id)),
      2000,
    );
    return () => clearTimeout(t);
  }, [focusWordId, rows.length]);

  // "Got it!" is a toggle: tapping an already-marked word un-marks it, so a
  // mis-tap doesn't require the full "not yet" round-trip to undo.
  async function markGotIt(wordId, currentState) {
    const next = currentState === "gotIt" ? null : "gotIt";
    await window.__storage.setMark(sessionId, wordId, next);
    if (next === "gotIt") {
      window.__audio.playGotIt();
      setJustMarkedId(wordId);
      setTimeout(
        () => setJustMarkedId((id) => (id === wordId ? null : id)),
        900,
      );
    }
    refresh();
  }

  // Not yet — mark it as such (the attempt about to be redone makes any old
  // mark stale either way) and send Chloe back to the usual practice
  // screen for just this one word, in the same session. Test.jsx returns
  // here (rather than Celebration) once she's heard it, written it again,
  // and saved.
  async function notYet(wordId) {
    await window.__storage.setMark(sessionId, wordId, "notYet");
    onNavigate("test", {
      listId: list.id,
      sessionId,
      wordId,
      returnTo: "review",
    });
  }

  function playAudio(word) {
    window.__audio.playWordEntry(word);
  }

  if (!list || !session) return null;

  const gotItCount = rows.filter((r) => r.state === "gotIt").length;

  return (
    <Screen max="max-w-3xl">
      <PageHeader
        title={`Reviewing: ${list.name}`}
        onBack={() => onNavigate("sessionHistory", { listId: list.id })}
        backLabel="Back to history"
        actions={
          rows.length > 0 ? (
            <p className="text-sm font-semibold text-slate-500">
              {gotItCount} got it · {rows.length - gotItCount} to practise
            </p>
          ) : null
        }
      />
      {/* The one screen in the app that scrolls — every other screen fits
          the viewport and clips instead (see index.css). A completed list
          can easily be taller than one screen, and Chloe never needs this
          screen at all (it's parent-only), so trading the app's usual
          no-scroll feel for reachability here is the right call. */}
      <div className="mx-auto flex w-full flex-1 flex-col gap-5 overflow-y-auto pb-1">
        {rows.map(({ word, strokes, state }) => {
          const attempted = strokes.length > 0;
          return (
            <div
              key={word.id}
              ref={(el) => {
                cardRefs.current[word.id] = el;
              }}
              className={`card relative transition-shadow ${highlightId === word.id ? "ring-4 ring-sky-300" : ""}`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-2xl font-semibold text-slate-800">
                  <span className="truncate">{word.text}</span>
                  {state === "gotIt" && (
                    <span
                      role="img"
                      aria-label="You got it!"
                      className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-emerald-400 text-4xl shadow-md ${justMarkedId === word.id ? "tick-pop" : ""}`}
                    >
                      🌟
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => playAudio(word)}
                  className="btn btn-secondary btn-sm shrink-0"
                >
                  Play
                </button>
              </div>

              {attempted ? (
                <StrokeReplay strokes={strokes} />
              ) : (
                <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-slate-400">
                  Not attempted yet
                </p>
              )}

              {state === "notYet" && (
                <p className="mt-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  It's spelled{" "}
                  <span className="font-semibold">"{word.text}"</span> — have
                  another go whenever she's ready!
                </p>
              )}

              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => markGotIt(word.id, state)}
                  disabled={!attempted}
                  aria-pressed={state === "gotIt"}
                  className={`btn btn-go btn-sm ${state === "gotIt" ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                >
                  {state === "gotIt" ? "✓ Got it!" : "Got it!"}
                </button>
                <button
                  type="button"
                  onClick={() => notYet(word.id)}
                  disabled={!attempted}
                  title="Not yet — send back to hear it and write it again"
                  className="btn btn-redo btn-sm"
                >
                  Not yet — try again
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
