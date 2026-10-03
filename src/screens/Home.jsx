import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";
import Buddy from "../buddy/Buddy.jsx";
import useBuddyStyle from "../buddy/useBuddyStyle.js";
import {
  getPose,
  setPose as setSavedPose,
  isMoved,
  ZERO_POSE,
} from "../buddy/pose.js";

// Days without a finished practice before Buddy gets sleepy, and the streak
// length that earns a victory dance.
const SLEEPY_AFTER_DAYS = 3;
const DANCE_STREAK = 3;

const BUDDY_LINES = [
  "Ready to spell?",
  "I love your writing!",
  "Let's practise together!",
  "You make me so happy!",
  "Tee hee, that tickles!",
];

export default function Home({ onNavigate }) {
  const [latestList, setLatestList] = useState(null);
  const [latestWords, setLatestWords] = useState([]);
  const [stickersEnabled, setStickersEnabled] = useState(false);
  const [childName, setChildName] = useState("");
  const [bubble, setBubble] = useState(null);
  const [woke, setWoke] = useState(false);
  const [pose, setPoseState] = useState(getPose);
  const [streak, setStreak] = useState(0);
  const [daysAway, setDaysAway] = useState(0);
  const buddyStyle = useBuddyStyle();

  useEffect(() => {
    (async () => {
      const lists = await window.__storage.getLists(); // newest first
      if (lists.length === 0) return;
      setLatestList(lists[0]);
      setLatestWords(await window.__storage.getWords(lists[0].id));
    })();
    (async () =>
      setStickersEnabled(await window.__storage.getStickersEnabled()))();
    (async () => setChildName(await window.__storage.getChildName()))();
    // Both reads are issued together at mount (not one after the other), so
    // every request is in flight before the first await settles.
    (async () => setStreak(await window.__storage.getPracticeStreak()))();
    (async () => {
      const last = await window.__storage.getLastPracticeAt();
      setDaysAway(last ? Math.floor((Date.now() - last) / 86400000) : 0);
    })();
  }, []);

  // Never-practised (daysAway 0) is a fresh start, not "sleepy". Sleepy is a
  // gentle "I missed you", never a scolding — and one tap wakes Buddy up.
  const sleepy = daysAway >= SLEEPY_AFTER_DAYS && !woke;
  const buddyMood = sleepy
    ? "sleepy"
    : streak >= DANCE_STREAK
      ? "dance"
      : "wave";
  const greeting = sleepy
    ? "Zzz… oh! Is that you?"
    : streak >= DANCE_STREAK
      ? `${streak} days in a row! Let's dance!`
      : `Hi${childName ? ` ${childName}` : ""}!`;

  function changePose(next) {
    setPoseState(next);
    setSavedPose(next);
  }

  function buddyTapped() {
    if (sleepy) {
      setWoke(true);
      const line = "I missed you! Let's practise!";
      setBubble(line);
      window.__audio.buddySay?.(line);
      return;
    }
    const line = BUDDY_LINES[Math.floor(Math.random() * BUDDY_LINES.length)];
    setBubble(line);
    window.__audio.buddySay?.(line);
  }

  function playWord(word) {
    window.__audio.playWordEntry(word);
  }

  return (
    <Screen centered allowOverflow max="max-w-2xl">
      <h1 className="t-hero">My Spelling Buddy</h1>

      <div className="relative flex items-end justify-center gap-2">
        {/* A soft warm glow, like a nightlight — Buddy should feel snug. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-4 left-1/2 h-40 w-40 -translate-x-[70%] rounded-full bg-amber-200/60 blur-3xl"
        />
        <Buddy
          mood={buddyMood}
          color={buddyStyle.color}
          accessory={buddyStyle.accessory}
          size={110}
          label="Buddy"
          onTap={buddyTapped}
          movable
          pose={pose}
          onPoseChange={changePose}
        />
        <p
          aria-live="polite"
          className="mb-16 max-w-[12rem] rounded-2xl rounded-bl-none bg-white px-4 py-2 text-base font-semibold text-slate-700 shadow-md"
        >
          {bubble || greeting}
        </p>
      </div>

      {latestList && (
        <div className="card w-full text-left">
          <p className="t-label mb-2">Latest list: {latestList.name}</p>
          {latestWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {latestWords.map((word) => (
                <button
                  key={word.id}
                  type="button"
                  onClick={() => playWord(word)}
                  aria-label={`Say "${word.text}"`}
                  className="flex items-center gap-1 rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-700 transition active:scale-95 hover:bg-sky-200"
                >
                  <span aria-hidden="true">🔊</span>
                  {word.text}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No words added yet.</p>
          )}
        </div>
      )}

      {isMoved(pose) && (
        <button
          type="button"
          onClick={() => changePose(ZERO_POSE)}
          // Out of the flow (fixed): appearing must never re-centre Home and
          // make everything — Buddy included — jump while it's being dragged.
          className="btn btn-secondary btn-sm fixed bottom-4 left-1/2 z-40 -translate-x-1/2"
        >
          ↺ Put Buddy back
        </button>
      )}

      <div className="flex w-full flex-col gap-4 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="btn btn-go btn-hero flex-1 sm:max-w-xs"
        >
          Practise
        </button>
        <button
          type="button"
          onClick={() => onNavigate("parentMenu")}
          className="btn btn-secondary btn-hero flex-1 text-xl sm:max-w-[12rem]"
        >
          Parents
        </button>
      </div>

      <button
        type="button"
        onClick={() => onNavigate("dressUp")}
        className="btn btn-secondary btn-sm"
      >
        🎨 Dress up Buddy
      </button>

      {stickersEnabled && (
        <button
          type="button"
          onClick={() => onNavigate("stickers")}
          className="btn btn-secondary btn-sm"
        >
          🎖️ My Stickers
        </button>
      )}
    </Screen>
  );
}
