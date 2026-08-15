import { useEffect, useRef, useState } from "react";
import StrokeReplay from "../canvas/StrokeReplay.jsx";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";

export default function Review({ listId, focusWordId, onNavigate }) {
  const [list, setList] = useState(null);
  const [rows, setRows] = useState([]);
  // Transient — drives the brief celebratory pop/pulse. Separate from the
  // persisted "ticked" mark so marking many words in a row doesn't leave a
  // page full of permanently-pulsing badges (the pulse used to be
  // `animate-ping`'s default `infinite`, which never actually stopped).
  const [justTickedId, setJustTickedId] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const cardRefs = useRef({});

  async function refresh() {
    const l = await window.__storage.getList(listId);
    setList(l);
    const words = await window.__storage.getWords(listId);
    const marks = await window.__storage.getMarksForList(listId);
    const built = [];
    for (const w of words) {
      const strokes = await window.__storage.getAttempt(listId, w.id);
      built.push({ word: w, strokes: strokes || [], ticked: !!marks[w.id] });
    }
    setRows(built);
  }

  useEffect(() => {
    refresh();
  }, [listId]);

  // Coming back from a Redo lands on a specific word rather than the top of
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

  // Mark correct is a toggle: tapping an already-ticked word un-marks it,
  // so a mis-tap doesn't require the full Redo round-trip to undo.
  async function toggleTick(wordId, currentlyTicked) {
    await window.__storage.setMark(listId, wordId, !currentlyTicked);
    if (!currentlyTicked) {
      window.__audio.playHappyTick();
      setJustTickedId(wordId);
      setTimeout(
        () => setJustTickedId((id) => (id === wordId ? null : id)),
        900,
      );
    }
    refresh();
  }

  // Not correct — clear any existing mark (the attempt about to be redone
  // makes the old mark stale either way) and send the student back to the
  // usual practice screen for just this one word. Test.jsx returns here
  // (rather than to Celebration) once they've heard it, written it again,
  // and saved, passing the word id back so we can scroll to it.
  async function redo(wordId) {
    await window.__storage.setMark(listId, wordId, false);
    onNavigate("test", { listId, wordId, returnTo: "review" });
  }

  function playAudio(word) {
    if (word.useTts) window.__audio.speakWordEntry(word);
    else if (word.audioBlob) window.__audio.playRecordedAudio(word.audioBlob);
  }

  if (!list) return null;

  const markedCount = rows.filter((r) => r.ticked).length;

  return (
    <Screen max="max-w-3xl">
      <PageHeader
        title={`Reviewing: ${list.name}`}
        onBack={() => onNavigate("lists", { mode: "review" })}
        backLabel="Back to lists"
        actions={
          rows.length > 0 ? (
            <p className="text-sm font-semibold text-slate-500">
              {markedCount} of {rows.length} marked
            </p>
          ) : null
        }
      />
      {/* The one screen in the app that scrolls — every other screen fits
          the viewport and clips instead (see index.css). A completed list
          can easily be taller than one screen, and Chloe never needs this
          screen at all (it's parent-only), so trading the app's usual
          no-scroll feel for reachability here is the right call.

          The column is centred: it used to be max-w-2xl with no mx-auto, so
          the cards hugged the left edge while the header spanned the full
          width above them. */}
      <div className="mx-auto flex w-full flex-1 flex-col gap-5 overflow-y-auto pb-1">
        {rows.map(({ word, strokes, ticked }) => {
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
                  {ticked && (
                    <span
                      role="img"
                      aria-label="Marked correct"
                      className={`flex h-11 w-11 items-center justify-center rounded-full bg-rose-100 text-3xl font-bold text-rose-500 ${justTickedId === word.id ? "tick-pop" : ""}`}
                    >
                      ✓
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

              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => toggleTick(word.id, ticked)}
                  disabled={!attempted}
                  aria-pressed={ticked}
                  className={`btn btn-go btn-sm ${ticked ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                >
                  {ticked ? "✓ Correct" : "Mark correct"}
                </button>
                <button
                  type="button"
                  onClick={() => redo(word.id)}
                  disabled={!attempted}
                  title="Not correct — send back to hear it and write it again"
                  className="btn btn-redo btn-sm"
                >
                  Redo
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
