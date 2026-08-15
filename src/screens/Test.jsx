import { useEffect, useRef, useState } from "react";
import Whiteboard from "../canvas/Whiteboard.jsx";
import { getRandomPraise } from "../praise.js";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// wordId + returnTo turn this into a single-word redo: Review sends a
// parent here to have Chloe redo just one word, then bounces straight
// back to Review instead of ending the whole list at Celebration.
export default function Test({
  listId,
  shuffle,
  wordId,
  returnTo,
  onNavigate,
}) {
  const [words, setWords] = useState(null);
  const [index, setIndex] = useState(0);
  const [praise, setPraise] = useState(null);
  // Most devices (Android, laptops, any iPad without a Pencil to hand) have
  // no stylus at all, so a finger must be able to draw by default — palm
  // rejection already suppresses stray touches while a pen is actively
  // tracked, so Pencil users lose nothing. Defaulting this off (as it
  // originally was) meant a child's finger did nothing at all on first run
  // on any non-Pencil device, with the only escape being a text button she
  // can't read.
  const [fingerDraw, setFingerDraw] = useState(true);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const wbRef = useRef(null);

  useEffect(() => {
    (async () => {
      const loaded = await window.__storage.getWords(listId);
      const scoped = wordId ? loaded.filter((w) => w.id === wordId) : loaded;
      setWords(shuffle ? shuffleArray(scoped) : scoped);
    })();
  }, [listId, shuffle, wordId]);

  if (!words) return null;
  if (words.length === 0) {
    return (
      <Screen centered max="max-w-xl">
        <p className="text-xl text-slate-700">
          {wordId
            ? "That word isn't there anymore."
            : "This list has no words yet — ask a parent to add some!"}
        </p>
        <button
          type="button"
          onClick={() =>
            returnTo ? onNavigate(returnTo, { listId }) : onNavigate("home")
          }
          className="btn btn-secondary"
        >
          {returnTo ? "Back" : "Home"}
        </button>
      </Screen>
    );
  }

  const word = words[index];
  const isLast = index + 1 >= words.length;

  function playWord() {
    if (word.useTts) window.__audio.speakWordEntry(word);
    else if (word.audioBlob) window.__audio.playRecordedAudio(word.audioBlob);
    else return;
    // A tap with no visible response reads as broken to a child who can't
    // diagnose "volume's down" or "autoplay got blocked" — a brief pulse
    // is at least proof the tap registered.
    setIsPlayingAudio(true);
    setTimeout(() => setIsPlayingAudio(false), 1400);
  }

  async function save() {
    const strokes = wbRef.current.getStrokes();
    await window.__storage.putAttempt(listId, word.id, strokes);
    await window.__audio.playSaveChime();
    setPraise(getRandomPraise());
  }

  function next() {
    setPraise(null);
    if (isLast) {
      onNavigate(
        returnTo || "celebration",
        returnTo ? { listId, focusWordId: word.id } : { listId },
      );
    } else {
      setIndex(index + 1);
    }
  }

  return (
    <Screen tight max="max-w-none">
      <PageHeader
        compact
        title={
          words.length > 1
            ? `Word ${index + 1} of ${words.length}`
            : returnTo
              ? "Have another try"
              : "Word 1 of 1"
        }
        onBack={() =>
          returnTo ? onNavigate(returnTo, { listId }) : onNavigate("home")
        }
        backLabel={returnTo ? "Back" : "Home"}
      />

      {words.length > 1 && (
        <>
          <div className="mx-auto mb-2 h-2.5 w-full max-w-md shrink-0 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${(index / words.length) * 100}%` }}
            />
          </div>

          {/* Fixed-height row, and the stars scale with `transform` rather
              than font-size. Both matter: a star growing from text-4xl to
              text-5xl changed the row's height, which silently resized the
              whiteboard below it. transform doesn't participate in layout.
              Past 12 words the row would wrap to a second line (another
              silent reflow), so the progress bar carries it alone. */}
          {words.length <= 12 && (
            <div className="mb-2 flex h-9 shrink-0 items-center justify-center gap-1.5 short:h-8">
              {words.map((_, i) => {
                // A word's star lights the moment it's saved, not only once
                // the child taps "Next word" — the payoff should land right
                // when she earns it.
                const done = i < index || (i === index && !!praise);
                const current = i === index && !praise;
                return (
                  <span
                    key={i}
                    className={`text-3xl leading-none transition-transform duration-300 ${
                      done
                        ? "scale-100 text-amber-400"
                        : current
                          ? "scale-125 text-amber-300 drop-shadow"
                          : "scale-90 text-slate-200"
                    }`}
                  >
                    {"★"}
                  </span>
                );
              })}
            </div>
          )}
        </>
      )}

      <button
        type="button"
        onClick={playWord}
        aria-label="Play the word"
        className={`mx-auto mb-2 flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-4xl text-white shadow-lg transition active:scale-95 short:h-16 short:w-16 short:text-2xl ${isPlayingAudio ? "scale-110 ring-8 ring-emerald-200" : ""}`}
      >
        {"▶"}
      </button>

      <div className="min-h-0 flex-1">
        <Whiteboard
          key={word.id}
          ref={wbRef}
          fingerDraw={fingerDraw}
          onFingerDrawChange={setFingerDraw}
        />
      </div>

      {/* Fixed-height footer. Save and the praise message occupy the same
          slot at the same height, so saving a word cannot resize the
          whiteboard above — which is what left the canvas at a stale size,
          overflowing its container and painting over the toolbar. */}
      <div className="mt-3 flex h-[4.5rem] shrink-0 items-center justify-center gap-4 short:mt-2 short:h-16">
        {!praise ? (
          <button
            type="button"
            onClick={save}
            className="btn btn-primary btn-lg w-full max-w-[18rem]"
          >
            Save
          </button>
        ) : (
          <>
            <p className="min-w-0 truncate text-xl font-bold text-emerald-600">
              {praise}
            </p>
            <button
              type="button"
              onClick={next}
              className="btn btn-go btn-lg shrink-0"
            >
              {isLast && returnTo ? "Done — back to review" : "Next word"}
            </button>
          </>
        )}
      </div>
    </Screen>
  );
}
