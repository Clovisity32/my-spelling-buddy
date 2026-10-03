import { useEffect, useState } from "react";
import Screen from "../components/Screen.jsx";
import PageHeader from "../components/PageHeader.jsx";
import Buddy, { BUDDY_COLORS } from "../buddy/Buddy.jsx";
import {
  COLOR_UNLOCKS,
  ACCESSORY_UNLOCKS,
  isUnlocked,
} from "../buddy/unlocks.js";

const LOVE_LINES = [
  "Ooh, I love it!",
  "So pretty!",
  "Wow, look at me!",
  "That's my favourite!",
];

// Pick Buddy's colour and accessory. Choices unlock with completed
// practices (effort only) — locked ones stay visible with how many more it
// takes, so there's always something to look forward to. Changes save the
// moment she taps, so there's no Save button to forget.
export default function DressUp({ onNavigate }) {
  const [style, setStyle] = useState(null);
  const [total, setTotal] = useState(0);
  const [mood, setMood] = useState("wave");

  useEffect(() => {
    (async () => {
      setStyle(await window.__storage.getBuddyStyle());
      setTotal(await window.__storage.getTotalCompletedSessionCount());
    })();
  }, []);

  if (!style) return null;

  async function choose(patch) {
    const next = { ...style, ...patch };
    setStyle(next);
    await window.__storage.setBuddyStyle(next);
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
    <Screen max="max-w-2xl">
      <PageHeader title="Dress up Buddy" onBack={() => onNavigate("home")} />
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto pb-2">
        <div className="pt-6">
          <Buddy
            mood={mood}
            color={style.color}
            accessory={style.accessory}
            size={110}
            label="Buddy"
          />
        </div>

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

        <section className="w-full">
          <p className="t-label mb-2">Accessory</p>
          <div className="flex flex-wrap gap-3">
            {ACCESSORY_UNLOCKS.map((a) => {
              const open = isUnlocked(a, total);
              const on = style.accessory === a.id;
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
