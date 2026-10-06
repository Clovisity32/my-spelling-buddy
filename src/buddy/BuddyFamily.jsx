import { useEffect, useState } from "react";
import Buddy from "./Buddy.jsx";
import "./scene.css";

// Overlapping like her drawing: tall ones at the back, small ones in front.
// Each member has its own colour, voice pitch and xylophone note.
const MEMBERS = [
  { color: "lavender", size: 96, left: "0%", bottom: "6%", z: 1, delay: 0.0 },
  { color: "sky", size: 104, left: "74%", bottom: "6%", z: 1, delay: 0.3 },
  { color: "mint", size: 112, left: "16%", bottom: "0%", z: 2, delay: 0.15 },
  { color: "butter", size: 112, left: "58%", bottom: "0%", z: 2, delay: 0.45 },
  { color: "peach", size: 140, left: "36%", bottom: "-4%", z: 3, delay: 0.1 },
  { color: "rose", size: 80, left: "6%", bottom: "-6%", z: 4, delay: 0.6 },
  { color: "coral", size: 80, left: "82%", bottom: "-6%", z: 4, delay: 0.25 },
];

const LEAD = 4;

// How the family celebrates. dance = the original pile; sing = swaying with
// music notes; run = everyone sprints back and forth; queue = they hop into a
// tidy line, then hop in turn like a wave.
export const PARTY_STYLES = ["dance", "sing", "run", "queue"];

// A different celebration each time. `?party=queue` forces one (to preview
// it), and automated browsers always get the steady "dance" layout so the
// members aren't running about while a test clicks on them.
export function pickPartyStyle() {
  try {
    const forced = new URLSearchParams(window.location.search).get("party");
    if (PARTY_STYLES.includes(forced)) return forced;
    if (navigator.webdriver) return "dance";
  } catch {
    // fall through to a random pick
  }
  return PARTY_STYLES[Math.floor(Math.random() * PARTY_STYLES.length)];
}

// The centre (biggest) member is Chloe's own Buddy, wearing what she chose;
// anyone else who'd share its colour swaps to peach so the family stays
// distinct.
export default function BuddyFamily({
  mood = "dance",
  leadColor = "peach",
  leadAccessory = "none",
  className = "",
  party = "dance",
}) {
  // The queue forms a moment after the family appears, so you see them hop
  // into line rather than just being there.
  const [lined, setLined] = useState(false);
  useEffect(() => {
    if (party !== "queue") return;
    const id = setTimeout(() => setLined(true), 900);
    return () => clearTimeout(id);
  }, [party]);
  const queued = party === "queue" && lined;

  return (
    <div
      className={`relative mx-auto h-56 w-full max-w-md sm:h-64 ${className}`}
      aria-label="Buddy and friends"
      data-party={party}
    >
      {MEMBERS.map((m, i) => (
        <div
          key={m.color}
          className={`absolute fam-member fam-${party}`}
          style={{
            left: queued ? `${3 + i * 14}%` : m.left,
            bottom: queued ? "0%" : m.bottom,
            "--i": i,
            "--dur": `${1.6 + (i % 3) * 0.35}s`,
            zIndex: m.z,
            width: `${m.size * 0.62}px`,
            animationDelay: `${m.delay}s`,
          }}
        >
          <div
            className={queued ? "fam-hop" : ""}
            style={{ animationDelay: queued ? `${i * 0.18}s` : `${m.delay}s` }}
          >
            {party === "sing" && (
              <span
                className="fam-note"
                style={{ animationDelay: `${m.delay * 3}s` }}
                aria-hidden="true"
              >
                {i % 2 ? "♪" : "♫"}
              </span>
            )}
            <Buddy
              mood={mood}
              color={
                i === LEAD
                  ? leadColor
                  : m.color === leadColor
                    ? "peach"
                    : m.color
              }
              accessory={i === LEAD ? leadAccessory : "none"}
              size={m.size * 0.62}
              pitch={0.8 + i * 0.09}
              label={`${m.color} buddy`}
              onTap={() => window.__audio?.playBuddyNote?.(i)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
