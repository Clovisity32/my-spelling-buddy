import { useEffect, useState } from "react";
import Buddy from "./Buddy.jsx";
import "./scene.css";
import { celestialPosition, phaseOf, sceneIsStill } from "./timeOfDay.js";

// Sky colours, ground and window light for each part of the day.
const SKY = {
  night: {
    sky: "linear-gradient(#0b1437, #2a2f6b)",
    hill: "#2f5d52",
    hill2: "#27504a",
    window: "#ffd866",
  },
  dawn: {
    sky: "linear-gradient(#f7a8b8, #ffe2c2)",
    hill: "#9fd6a0",
    hill2: "#86c78e",
    window: "#ffe9a8",
  },
  day: {
    sky: "linear-gradient(#6ec3f5, #cfeeff)",
    hill: "#8fd694",
    hill2: "#76c57f",
    window: "#bfe3f7",
  },
  dusk: {
    sky: "linear-gradient(#6a5cb0, #ff9a76)",
    hill: "#7da36b",
    hill2: "#6a9460",
    window: "#ffd866",
  },
};

const STARS = [
  [8, 10, 2],
  [18, 26, 1.5],
  [30, 8, 2],
  [42, 22, 1.5],
  [55, 12, 2.5],
  [66, 28, 1.5],
  [76, 9, 2],
  [88, 20, 2],
  [94, 8, 1.5],
  [48, 6, 1.5],
];

// The friends who live nearby. At night they doze; by day they play.
const FRIENDS = [
  {
    color: "lavender",
    move: "spin",
    left: "58%",
    size: 54,
    mood: "dance",
    delay: "0s",
    pitch: 1.35,
    tempo: 1.3,
    line: "Hee hee! Hi!",
  },
  {
    color: "mint",
    move: "hop",
    left: "68%",
    size: 62,
    mood: "wave",
    delay: "0.3s",
    pitch: 1.05,
    tempo: 0.8,
    line: "Hello, friend!",
  },
  {
    color: "butter",
    move: "slide",
    left: "78%",
    size: 56,
    mood: "dance",
    delay: "0.6s",
    pitch: 1.55,
    tempo: 1.1,
    line: "Let's play!",
  },
  {
    color: "rose",
    move: "roll",
    left: "88%",
    size: 50,
    mood: "wave",
    delay: "0.9s",
    pitch: 0.9,
    tempo: 1.0,
    line: "You can do it!",
  },
];

// While a snack is held, every Buddy that hasn't eaten yet gets a glowing
// target over it: drop the snack here (or tap here) to feed it.
function FeedTarget({ id, label, onFeed }) {
  return (
    <button
      type="button"
      className="feed-target"
      data-feed-id={id}
      aria-label={`Feed ${label}`}
      onClick={() => onFeed?.(id)}
    />
  );
}

function Cloud({ top, size, delay }) {
  return (
    <div
      className="scene-cloud"
      style={{ top, width: size, height: size * 0.45, animationDelay: delay }}
    />
  );
}

function House({ phase, doorOpen, presence, knocking, onKnock }) {
  const { window: win } = SKY[phase];
  return (
    <div
      className={`scene-house${knocking ? " scene-house--knock" : ""}`}
      data-door={doorOpen ? "open" : "closed"}
    >
      <svg viewBox="0 0 200 170" className="block w-full" aria-hidden="true">
        {/* chimney */}
        <rect
          x="140"
          y="14"
          width="18"
          height="40"
          fill="#c46a5a"
          stroke="#9c4a3e"
          strokeWidth="3"
        />
        <rect
          x="26"
          y="70"
          width="148"
          height="96"
          rx="4"
          fill="#fff3d6"
          stroke="#d9b779"
          strokeWidth="4"
        />
        <path
          d="M10 76 L100 8 L190 76 Z"
          fill="#e5604d"
          stroke="#b9402f"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <circle
          cx="100"
          cy="52"
          r="11"
          fill={win}
          stroke="#b9402f"
          strokeWidth="4"
        />
        {/* windows, glowing at night */}
        {[44, 128].map((x) => (
          <g key={x}>
            <rect
              x={x}
              y="94"
              width="28"
              height="28"
              rx="3"
              fill={win}
              stroke="#8a6d3b"
              strokeWidth="3"
            />
            <path
              d={`M${x + 14} 94 V122 M${x} 108 H${x + 28}`}
              stroke="#8a6d3b"
              strokeWidth="2.5"
            />
          </g>
        ))}
        {/* door: a dark doorway with the door swung open in front of it */}
        <path d="M82 166 V118 Q100 98 118 118 V166 Z" fill="#3a2a2a" />
        <g
          className={doorOpen ? "scene-door scene-door--open" : "scene-door"}
          style={{ transformOrigin: "82px 140px" }}
        >
          <path
            d="M82 166 V118 Q100 98 118 118 V166 Z"
            fill="#9b6a43"
            stroke="#6e4a2a"
            strokeWidth="3"
          />
          <circle cx="111" cy="142" r="3" fill="#ffd54a" />
        </g>
      </svg>
      {presence === "in" && (
        <button
          type="button"
          className="scene-door-knock"
          aria-label="Knock on Buddy's door"
          onClick={onKnock}
        />
      )}
      {knocking && (
        <span className="scene-knock-text" aria-hidden="true">
          Knock! Knock!
        </span>
      )}
    </div>
  );
}

// Home's backdrop: sky with the sun or moon in the right place for the time of
// day, a house, a few friends, and — on top — Buddy, who comes out of the front
// door (`children` is the lead Buddy; `bubble` its speech bubble).
// `presence` is where Buddy is: out (on the lawn), going (walking to the
// door), in (home, door shut — knock to call it out) or coming (stepping out).
export default function HomeScene({
  hour,
  action = "wave",
  children,
  bubble,
  presence = "out",
  knocking = false,
  cycle = 0,
  onKnock,
  // Feeding: `holding` is true while a snack is picked up; `fed` are the
  // Buddies already fed from this basket; eatingId munches, happyId cheers.
  holding = false,
  fed = [],
  eatingId = null,
  happyId = null,
  onFeed,
}) {
  const phase = phaseOf(hour);
  // The door swings open once the scene has mounted, and shuts when Buddy is in.
  const [doorOpen, setDoorOpen] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setDoorOpen(presence !== "in"), 50);
    return () => clearTimeout(id);
  }, [presence]);
  // Friends watch Buddy's daily show: they cheer while it performs (the door
  // entrance takes 1.6s, the act about 4s), then go back to playing.
  const [cheering, setCheering] = useState(false);
  const [said, setSaid] = useState(null);
  useEffect(() => {
    if (sceneIsStill()) return;
    const on = setTimeout(() => setCheering(true), 1600);
    const off = setTimeout(() => setCheering(false), 5800);
    return () => {
      clearTimeout(on);
      clearTimeout(off);
    };
  }, [cycle]);
  // A fed friend thanks you in its own voice.
  useEffect(() => {
    const f = FRIENDS.find((x) => x.color === happyId);
    if (!f) return;
    setSaid(f.color);
    window.__audio?.playBuddyBabble?.("Yum yum!", f.pitch, f.tempo);
  }, [happyId]);
  useEffect(() => {
    if (said === null) return;
    const id = setTimeout(() => setSaid(null), 2200);
    return () => clearTimeout(id);
  }, [said]);
  const pal = SKY[phase];
  const { body, x, y } = celestialPosition(hour);
  const night = phase === "night";

  // Fills the whole page behind the controls (no box): the Home screen is the
  // scene. Positioned but z-index:auto, so Buddy can still sit above the
  // buttons while being dragged.
  return (
    <div
      className={`scene absolute inset-0 ${sceneIsStill() ? "scene-still" : ""}`}
      aria-label="Buddy's neighbourhood"
      data-time-of-day={phase}
      data-buddy-action={action}
      data-buddy-presence={presence}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden"
        style={{ background: pal.sky, transition: "background 2s" }}
      >
        {night &&
          STARS.map(([sx, sy, r], i) => (
            <span
              key={i}
              className="scene-star"
              style={{
                left: `${sx}%`,
                top: `${sy}%`,
                width: r * 2,
                height: r * 2,
                animationDelay: `${(i % 5) * 0.4}s`,
              }}
            />
          ))}
        <div
          className={body === "sun" ? "scene-sun" : "scene-moon"}
          style={{ left: `${x * 88 + 2}%`, top: `${y * 55 + 2}%` }}
        />
        {!night && (
          <>
            <Cloud top="14%" size={70} delay="0s" />
            <Cloud top="30%" size={54} delay="-12s" />
          </>
        )}
        <div
          className="scene-hill absolute -left-[10%] w-[70%] rounded-[50%]"
          style={{
            background: pal.hill2,
            bottom: "calc(var(--ground) - 4.5rem)",
          }}
        />
        <div
          className="scene-hill absolute -right-[5%] w-[85%] rounded-[50%]"
          style={{
            background: pal.hill,
            bottom: "calc(var(--ground) - 5.5rem)",
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            background: pal.hill,
            height: "calc(var(--ground) - 1.5rem)",
          }}
        />
      </div>

      <House
        phase={phase}
        doorOpen={doorOpen}
        presence={presence}
        knocking={knocking}
        onKnock={onKnock}
      />

      {FRIENDS.map((f) => (
        <div
          key={f.color}
          className={`scene-friend${cheering && !night ? ` scene-friend--${f.move}` : ""}`}
          style={{ left: f.left, animationDelay: f.delay }}
        >
          {said === f.color && (
            <span className="scene-friend-say" role="status">
              {f.line}
            </span>
          )}
          <Buddy
            mood={
              eatingId === f.color
                ? "chew"
                : happyId === f.color
                  ? "cheer"
                  : night
                    ? "sleepy"
                    : cheering
                      ? "cheer"
                      : f.mood
            }
            color={f.color}
            size={f.size}
            pitch={f.pitch}
            label={`${f.color} friend`}
            onTap={() => {
              // With Buddy indoors, a friend's tap is a knock on its door.
              if (presence === "in") {
                onKnock?.();
                return;
              }
              setSaid(f.color);
              // After the chirp the tap itself makes, the friend "talks" in
              // its own pitch and speed.
              setTimeout(
                () =>
                  window.__audio?.playBuddyBabble?.(f.line, f.pitch, f.tempo),
                500,
              );
            }}
          />
          {holding && !fed.includes(f.color) && (
            <FeedTarget
              id={f.color}
              label={`${f.color} friend`}
              onFeed={onFeed}
            />
          )}
        </div>
      ))}

      <div className={`scene-lead scene-lead--${presence}`}>
        <div key={cycle} className={`scene-act scene-act--${action}`}>
          {children}
          {holding && presence === "out" && !fed.includes("lead") && (
            <FeedTarget id="lead" label="Buddy" onFeed={onFeed} />
          )}
          {action === "sing" && (
            <>
              <span className="scene-note scene-note--a" aria-hidden="true">
                ♪
              </span>
              <span className="scene-note scene-note--b" aria-hidden="true">
                ♫
              </span>
            </>
          )}
        </div>
      </div>

      {bubble && (
        <p
          aria-live="polite"
          className="scene-bubble absolute z-40 max-w-[10rem] rounded-2xl rounded-bl-none bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-md sm:text-base"
        >
          {bubble}
        </p>
      )}
    </div>
  );
}
