import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Buddy, { BUDDY_COLORS } from "../buddy/Buddy.jsx";
import {
  getPose,
  setPose as setSavedPose,
  isMoved,
  ZERO_POSE,
} from "../buddy/pose.js";
import {
  COLOR_UNLOCKS,
  ACCESSORY_UNLOCKS,
  FRIEND_WARDROBE_UNLOCKS,
  isUnlocked,
} from "../buddy/unlocks.js";

const LOVE_LINES = [
  "Ooh, I love it!",
  "So pretty!",
  "Wow, look at me!",
  "That's my favourite!",
];

// Pick Buddy's colour and accessory — and, once a friend's wardrobe has opened,
// what that friend wears (any accessory already unlocked). Choices unlock with completed
// practices (effort only) — locked ones stay visible with how many more it
// takes, so there's always something to look forward to. Changes save the
// moment she taps, so there's no Save button to forget.
export default function DressUp({ onNavigate }) {
  const [style, setStyle] = useState(null);
  const [friendStyles, setFriendStyles] = useState({});
  const [who, setWho] = useState("lead"); // "lead" or a friend's colour
  const [total, setTotal] = useState(0);
  const [mood, setMood] = useState("wave");
  // Same pose as Home: she can spin and resize Buddy to show off what it is
  // wearing, and it stays that way when she goes back.
  const [pose, setPoseState] = useState(getPose);

  function changePose(next) {
    setPoseState(next);
    setSavedPose(next);
  }

  useEffect(() => {
    (async () => {
      setStyle(await window.__storage.getBuddyStyle());
      setFriendStyles(await window.__storage.getFriendStyles());
      setTotal(await window.__storage.getTotalCompletedSessionCount());
    })();
  }, []);

  if (!style) return null;

  async function choose(patch) {
    if (who === "lead") {
      const next = { ...style, ...patch };
      setStyle(next);
      await window.__storage.setBuddyStyle(next);
    } else {
      setFriendStyles((f) => ({ ...f, [who]: patch.accessory }));
      await window.__storage.setFriendStyle(who, patch.accessory);
    }
    window.__audio.playBuddyNote?.(Math.floor(Math.random() * 7));
    window.__audio.buddySay?.(
      LOVE_LINES[Math.floor(Math.random() * LOVE_LINES.length)],
    );
    setMood("cheer");
    setTimeout(() => setMood("wave"), 1600);
  }

  const lockedHint = (item) => {
    const more = item.threshold - total;
    return `${more} more practice${more === 1 ? "" : "s"} to unlock`;
  };

  return (
    <Screen allowOverflow max="max-w-2xl">
      <PageHeader title="Dress up Buddy" onBack={() => onNavigate("home")} />
      {/* Buddy sits outside the scrolling area below: an overflow container
          would clip it the moment it was dragged or enlarged. */}
      <div className="flex shrink-0 justify-center pt-2">
        <Buddy
          mood={mood}
          color={who === "lead" ? style.color : who}
          accessory={
            who === "lead" ? style.accessory : friendStyles[who] || "none"
          }
          size={110}
          label="Buddy"
          movable
          pose={pose}
          onPoseChange={changePose}
        />
      </div>
      {isMoved(pose) && (
        <button
          type="button"
          onClick={() => changePose(ZERO_POSE)}
          // Fixed so it can never shift the layout while Buddy is dragged.
          className="btn btn-secondary btn-sm fixed bottom-4 left-1/2 z-40 -translate-x-1/2"
        >
          ↺ Put Buddy back
        </button>
      )}
      <div className="mt-2 flex shrink-0 flex-wrap justify-center gap-2">
        {[
          { id: "lead", label: "Buddy", threshold: 0 },
          ...FRIEND_WARDROBE_UNLOCKS,
        ].map((w) => {
          const open = isUnlocked(w, total);
          return (
            <button
              key={w.id}
              type="button"
              disabled={!open}
              onClick={() => setWho(w.id)}
              aria-label={
                w.id === "lead"
                  ? "Outfits for Buddy"
                  : open
                    ? `Outfits for ${w.id} friend`
                    : `Outfits for ${w.id} friend, locked`
              }
              aria-pressed={who === w.id}
              title={open ? w.label : lockedHint(w)}
              className={`flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm font-semibold shadow transition active:scale-95 ${who === w.id ? "ring-4 ring-emerald-400" : ""} ${open ? "" : "opacity-40 grayscale"}`}
            >
              <span
                className="inline-block h-4 w-4 rounded-full border border-slate-300"
                style={{
                  background:
                    BUDDY_COLORS[w.id === "lead" ? style.color : w.id].body,
                }}
              />
              {open ? w.label : `🔒 ${w.threshold}`}
            </button>
          );
        })}
      </div>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto pb-2 pt-4">
        {who === "lead" && (
        <section className="w-full">
          <p className="t-label mb-2">Colour</p>
          <div className="flex flex-wrap gap-3">
            {COLOR_UNLOCKS.map((c) => {
              const open = isUnlocked(c, total);
              const on = style.color === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!open}
                  onClick={() => choose({ color: c.id })}
                  aria-label={
                    open ? `${c.label} colour` : `${c.label} colour, locked`
                  }
                  aria-pressed={on}
                  title={open ? c.label : lockedHint(c)}
                  className={`h-14 w-14 rounded-full border-4 shadow transition active:scale-95 ${on ? "scale-110 border-emerald-500" : "border-white"} ${open ? "" : "opacity-30 grayscale"}`}
                  style={{ background: BUDDY_COLORS[c.id].body }}
                >
                  {open ? "" : "🔒"}
                </button>
              );
            })}
          </div>
        </section>
        )}

        <section className="w-full">
          <p className="t-label mb-2">Accessory</p>
          <div className="flex flex-wrap gap-3">
            {ACCESSORY_UNLOCKS.map((a) => {
              const open = isUnlocked(a, total);
              const on =
                (who === "lead" ? style.accessory : friendStyles[who] || "none") ===
                a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  disabled={!open}
                  onClick={() => choose({ accessory: a.id })}
                  aria-label={open ? a.label : `${a.label}, locked`}
                  aria-pressed={on}
                  title={open ? a.label : lockedHint(a)}
                  className={`flex h-16 w-16 flex-col items-center justify-center rounded-2xl bg-white text-3xl shadow transition active:scale-95 ${on ? "ring-4 ring-emerald-400" : ""} ${open ? "" : "opacity-40 grayscale"}`}
                >
                  <span>{open ? a.emoji : "🔒"}</span>
                  {!open && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      {a.threshold} practices
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </Screen>
  );
}
