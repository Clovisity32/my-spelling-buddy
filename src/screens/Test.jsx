import { useEffect, useRef, useState } from "react";
import Whiteboard from "../canvas/Whiteboard.jsx";
import { getRandomPraise } from "../praise.js";

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
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div className="flex flex-col items-center">
          <p className="text-xl">
            {wordId
              ? "That word isn't there anymore."
              : "This list has no words yet — ask a parent to add some!"}
          </p>
          <button
            type="button"
            onClick={() =>
              returnTo ? onNavigate(returnTo, { listId }) : onNavigate("home")
            }
            className="mt-4 rounded-xl bg-slate-300 px-6 py-3 font-semibold text-slate-700"
          >
            {returnTo ? "Back" : "Home"}
          </button>
        </div>
      </div>
    );
  }

  const word = words[index];
  const isLast = index + 1 >= words.length;

  function playWord() {
    if (word.useTts)
      window.__audio.speakWord(word.text, word.ttsLang, word.ttsVoiceURI);
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
    <div className="flex h-screen flex-col overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        {words.length > 1 ? (
          <p className="text-lg font-semibold text-slate-500">
            Word {index + 1} of {words.length}
          </p>
        ) : (
          <p className="text-lg font-semibold text-slate-500">
            {returnTo ? "Have another try" : "Word 1 of 1"}
          </p>
        )}
        <button
          type="button"
          onClick={() =>
            returnTo ? onNavigate(returnTo, { listId }) : onNavigate("home")
          }
          className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition active:scale-95"
        >
          {returnTo ? "Back" : "Home"}
        </button>
      </div>

      {words.length > 1 && (
        <>
          <div className="mx-auto mb-3 h-4 w-full max-w-md overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
              style={{ width: `${(index / words.length) * 100}%` }}
            />
          </div>

          <div className="mb-4 flex items-center justify-center gap-2">
            {words.map((_, i) => {
              // A word's star lights the moment it's saved, not only once
              // the child taps "Next word" — the payoff should land right
              // when she earns it.
              const done = i < index || (i === index && !!praise);
              const current = i === index && !praise;
              return (
                <span
                  key={i}
                  className={`transition-all duration-300 ${
                    done
                      ? "text-4xl text-amber-400"
                      : current
                        ? "text-5xl text-amber-300 drop-shadow"
                        : "text-3xl text-slate-200"
                  }`}
                >
                  {"★"}
                </span>
              );
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={playWord}
        aria-label="Play the word"
        className={`mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-400 text-4xl text-white shadow-lg transition active:scale-95 ${isPlayingAudio ? "scale-110 ring-8 ring-emerald-200" : ""}`}
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

      {!praise ? (
        <button
          type="button"
          onClick={save}
          className="mt-4 rounded-2xl bg-sky-500 px-8 py-4 text-2xl font-bold text-white shadow"
        >
          Save
        </button>
      ) : (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-white p-6 shadow">
          <p className="text-2xl font-bold text-emerald-600">{praise}</p>
          <button
            type="button"
            onClick={next}
            className="rounded-2xl bg-emerald-500 px-8 py-4 text-xl font-bold text-white"
          >
            {isLast && returnTo ? "Done — back to review" : "Next word"}
          </button>
        </div>
      )}
    </div>
  );
}
