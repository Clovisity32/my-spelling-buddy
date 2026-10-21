import { useEffect, useRef, useState } from "react";
import Buddy, { BUDDY_COLORS } from "./Buddy.jsx";
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

// True on a phone-width screen, where the lawn is short: the friends shrink
// (and scene.css lets them stand behind Buddy) so they aren't all piled up.
function useNarrow() {
  const query = "(max-width: 560px)";
  const [narrow, setNarrow] = useState(
    () => !!window.matchMedia?.(query).matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return narrow;
}

// The cottage where the four small friends live: a blue roof with a pennant in
// each friend's colour, round windows, and a door that swings open whenever
// one of them walks in or out.
function FriendsHouse({ phase, doorOpen, onKnock }) {
  const { window: win } = SKY[phase];
  return (
    <div className="scene-house2" data-door={doorOpen ? "open" : "closed"}>
      <svg viewBox="0 0 200 150" className="block w-full" aria-hidden="true">
        <rect
          x="24"
          y="64"
          width="152"
          height="84"
          rx="4"
          fill="#eef6ff"
          stroke="#8fb0d9"
          strokeWidth="4"
        />
        <path
          d="M8 70 L100 10 L192 70 Z"
          fill="#5b8def"
          stroke="#3a62b8"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        {FRIENDS.map((f, i) => (
          <path
            key={f.color}
            d={`M${32 + i * 40} 72 L${48 + i * 40} 72 L${40 + i * 40} 88 Z`}
            fill={BUDDY_COLORS[f.color].body}
            stroke={BUDDY_COLORS[f.color].edge}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        ))}
        {[44, 156].map((x) => (
          <circle
            key={x}
            cx={x}
            cy="112"
            r="14"
            fill={win}
            stroke="#3a62b8"
            strokeWidth="3.5"
          />
        ))}
        <path d="M82 148 V108 Q100 90 118 108 V148 Z" fill="#3a2a2a" />
        <g
          className={doorOpen ? "scene-door scene-door--open" : "scene-door"}
          style={{ transformOrigin: "82px 128px" }}
        >
          <path
            d="M82 148 V108 Q100 90 118 108 V148 Z"
            fill="#7aa7e6"
            stroke="#3a62b8"
            strokeWidth="3"
          />
          <circle cx="111" cy="128" r="3" fill="#ffd54a" />
        </g>
      </svg>
      <button
        type="button"
        className="scene-house2-knock"
        aria-label="Knock on the friends' door"
        onClick={onKnock}
      />
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
  // eatingFood: the snack the eater is chewing; sharedEat: it is a shared half.
  // hungry: the tray is open, so Buddies who haven't eaten look hopeful.
  // partyAll: the golden treat — everyone dances, with sparkles.
  eatingFood = null,
  sharedEat = false,
  hungry = false,
  partyAll = false,
  // The small friends (see useFriends): where each one is, how to move one
  // that's picked up, and the knock on their cottage door.
  friends,
  onFriendPose,
  onFriendDropped,
  onKnockFriends,
}) {
  const phase = phaseOf(hour);
  const narrow = useNarrow();
  const lawnA = useRef(null);
  const lawnB = useRef(null);
  const friendsDoorOpen = FRIENDS.some((f) =>
    ["coming", "going"].includes(friends[f.color].presence),
  );
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

      <FriendsHouse
        phase={phase}
        doorOpen={friendsDoorOpen}
        onKnock={onKnockFriends}
      />
      <span ref={lawnA} className="scene-lawn-a" aria-hidden="true" />
      <span ref={lawnB} className="scene-lawn-b" aria-hidden="true" />

      {FRIENDS.map((f) => {
        const st = friends[f.color];
        return (
          <div
            key={f.color}
            className={`scene-friend${cheering && !night && st.presence === "out" ? ` scene-friend--${f.move}` : ""}${st.presence === "in" ? " scene-friend--in" : ""}${st.lifted ? " scene-friend--lifted" : ""}`}
            style={{
              "--t": st.t,
              "--walk": `${st.dur}s`,
              animationDelay: f.delay,
            }}
          >
            {said === f.color && (
              <span className="scene-friend-say" role="status">
                {f.line}
              </span>
            )}
            <Buddy
              walking={st.walking}
              facing={st.facing}
              movable={st.presence === "out"}
              pose={st.pose}
              snap={st.snap}
              onPoseChange={(p) => onFriendPose?.(f.color, p)}
              onDragEnd={() => {
                const a = lawnA.current?.getBoundingClientRect().left ?? 0;
                const b = lawnB.current?.getBoundingClientRect().left ?? 0;
                onFriendDropped?.(f.color, b - a);
              }}
              mood={
                eatingId === f.color
                  ? "chew"
                  : happyId === f.color || partyAll
                    ? "cheer"
                    : hungry && !fed.includes(f.color)
                      ? "hungry"
                      : night
                        ? "sleepy"
                        : cheering
                          ? "cheer"
                          : f.mood
              }
              snack={eatingId === f.color ? eatingFood : null}
              shared={sharedEat}
              color={f.color}
              size={narrow ? f.size * 0.75 : f.size}
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
            {holding && (
              <FeedTarget
                id={f.color}
                label={`${f.color} friend`}
                onFeed={onFeed}
              />
            )}
          </div>
        );
      })}

      {partyAll && (
        <div className="scene-sparkles" aria-hidden="true">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              style={{
                left: `${6 + ((i * 37) % 88)}%`,
                animationDelay: `${(i % 7) * 0.35}s`,
              }}
            >
              {i % 3 === 0 ? "🌟" : "✨"}
            </span>
          ))}
        </div>
      )}

      <div className={`scene-lead scene-lead--${presence}`}>
        <div key={cycle} className={`scene-act scene-act--${action}`}>
          {children}
          {holding && presence === "out" && (
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
