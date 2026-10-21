import { useEffect, useMemo, useRef, useState } from "react";
import Screen from "../components/Screen.jsx";
import Buddy from "../buddy/Buddy.jsx";
import HomeScene from "../buddy/HomeScene.jsx";
import {
  currentHour,
  dayNumber,
  phaseOf,
  sceneIsStill,
} from "../buddy/timeOfDay.js";
import useFriends from "../buddy/useFriends.js";
import { foodById, isGolden } from "../buddy/foods.js";
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

// What Buddy does after stepping out of the house — a different one each day.
const DAILY_ACTIONS = [
  { id: "wave", line: (n) => `Hi${n}! I came out to say hello!` },
  { id: "cartwheel", line: () => "Watch me cartwheel! Wheee!" },
  { id: "flip3d", line: () => "I can spin every which way!" },
  { id: "hop", line: () => "Boing, boing, boing!" },
  { id: "run", line: () => "Race you to the tree!" },
  { id: "sing", line: () => "La la la! Let's sing!" },
  { id: "peek", line: () => "Peekaboo! I see you!" },
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
  // Where Buddy is: out on the lawn, going home, in (door shut — knock to
  // call it out) or coming out again.
  const [presence, setPresence] = useState(() =>
    new URLSearchParams(window.location.search).get("buddy") === "in"
      ? "in"
      : "out",
  );
  const [knocking, setKnocking] = useState(false);
  const [cycle, setCycle] = useState(0); // bumps each time Buddy steps out
  const timers = useRef([]);
  const feedLock = useRef(false); // a feeding (and any sharing after it) is under way
  // Food basket: snacks still in it, who has eaten, which snack is picked up,
  // who is chewing / happy right now, and where a dragged snack is.
  const [basket, setBasket] = useState({ foods: [], fed: [] });
  const [trayOpen, setTrayOpen] = useState(false);
  const [holding, setHolding] = useState(null);
  const [ghost, setGhost] = useState(null);
  const [eating, setEating] = useState(null);
  const [happy, setHappy] = useState(null);
  const [eatingFoodId, setEatingFoodId] = useState(null);
  const [sharedEat, setSharedEat] = useState(false);
  const [partyAll, setPartyAll] = useState(false); // the golden treat
  const buddyStyle = useBuddyStyle();
  const [hour, setHour] = useState(currentHour);
  // The small friends wander, go home and come out on their own — except in
  // the test browser and for anyone who asked for reduced motion.
  // `?roam=fast` shortens their timers for previewing (with `?scene=live`).
  const roam =
    !sceneIsStill() &&
    !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const fastRoam =
    new URLSearchParams(window.location.search).get("roam") === "fast";
  const friends = useFriends({
    roam,
    night: phaseOf(hour) === "night",
    tray: trayOpen,
    fed: basket.fed,
    fast: fastRoam,
  });
  const action = useMemo(
    () => DAILY_ACTIONS[dayNumber() % DAILY_ACTIONS.length],
    [],
  );

  // Keep the sky in step with the clock while the app stays open.
  useEffect(() => {
    const id = setInterval(() => setHour(currentHour()), 60000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Buddy goes home and comes back out by itself: after a while on the lawn
  // it wanders in, and a little later it steps out again (a knock still brings
  // it out sooner). It never leaves in the middle of something — snacks,
  // being carried or moved, or within 15s of being tapped or hugged.
  const lastTouch = useRef(0);
  const busy = useRef(false);
  busy.current =
    trayOpen ||
    !!eating ||
    feedLock.current ||
    !!holding ||
    knocking ||
    isMoved(pose) ||
    Date.now() - lastTouch.current < 15000;
  useEffect(() => {
    if (!roam || (presence !== "out" && presence !== "in")) return undefined;
    const secs = (lo, hi) =>
      (fastRoam ? lo / 6 : lo + Math.random() * (hi - lo)) * 1000;
    let id;
    function fire() {
      if (busy.current) {
        id = setTimeout(fire, secs(10, 10));
        return;
      }
      if (presence === "in") stepOut("I'm back!");
      else goHome();
    }
    id = setTimeout(fire, presence === "out" ? secs(40, 90) : secs(12, 30));
    return () => clearTimeout(id);
  }, [roam, presence]);

  // Buddy's daily door entrance on first load is a walk too (1.5s, as in
  // scene.css). Automated browsers get a still scene, so no walking there.
  const [arriving, setArriving] = useState(!sceneIsStill());
  useEffect(() => {
    if (!arriving) return undefined;
    const id = setTimeout(() => setArriving(false), 1500);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    (async () => {
      const lists = await window.__storage.getLists(); // newest first
      if (lists.length === 0) return;
      setLatestList(lists[0]);
      setLatestWords(await window.__storage.getWords(lists[0].id));
    })();
    (async () => setBasket(await window.__storage.getBasket()))();
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
  const buddyMood =
    eating === "lead"
      ? "chew"
      : happy === "lead"
        ? "cheer"
        : partyAll
          ? "dance"
          : trayOpen && !basket.fed.includes("lead") && presence === "out"
            ? "hungry"
            : sleepy
              ? "sleepy"
              : streak >= DANCE_STREAK
                ? "dance"
                : "wave";
  const greeting =
    presence === "in"
      ? "Knock, knock on my door to call me out!"
      : presence === "going"
        ? "Home sweet home!"
        : presence === "coming"
          ? "I'm coming! I'm coming!"
          : sleepy
            ? "Zzz… oh! Is that you?"
            : streak >= DANCE_STREAK
              ? `${streak} days in a row! Let's dance!`
              : action.line(childName ? ` ${childName}` : "");

  // The test browser gets an instant, still scene, so the steps have no waits.
  function later(fn, ms) {
    timers.current.push(setTimeout(fn, sceneIsStill() ? 0 : ms));
  }

  function goHome() {
    changePose(ZERO_POSE);
    setBubble(null);
    setPresence("going");
    later(() => setPresence("in"), 1100);
  }

  // Knock: the house shakes, then Buddy answers and walks out the door.
  function knock() {
    if (knocking || presence !== "in") return;
    setKnocking(true);
    setBubble(null);
    window.__audio.playKnock?.();
    later(() => {
      setKnocking(false);
      stepOut("I'm coming!");
    }, 1000);
  }

  // Buddy walks out of the front door (after a knock, or on its own).
  function stepOut(line) {
    setWoke(true);
    setCycle((c) => c + 1);
    setPresence("coming");
    window.__audio.buddySay?.(line);
    later(() => setPresence("out"), 1500);
  }

  function toggleTray() {
    if (trayOpen) {
      setTrayOpen(false);
      setHolding(null);
      return;
    }
    changePose(ZERO_POSE); // feeding targets sit on Buddy's home spot
    setTrayOpen(true);
  }

  // One Buddy chews its snack — bite, bite, bite, crumbs flying — for 3s (a
  // shared half takes 2s), then cheers. `then` runs once it has finished.
  function eat(buddyId, foodId, { shared = false, then } = {}) {
    setHappy(null);
    setEating(buddyId);
    setEatingFoodId(foodId);
    setSharedEat(shared);
    window.__audio.playMunch?.(1, shared ? 6 : 9);
    timers.current.push(
      setTimeout(
        () => {
          setEating(null);
          setEatingFoodId(null);
          setSharedEat(false);
          setHappy(buddyId);
          if (buddyId === "lead") {
            const line = "Yum yum! Thank you!";
            setBubble(line);
            window.__audio.buddySay?.(line);
          }
          timers.current.push(setTimeout(() => setHappy(null), 2600));
          then?.();
        },
        shared ? 2000 : 3000,
      ),
    );
  }

  // Feed the held snack to a Buddy. One that has already eaten may take another
  // while someone is still hungry: it eats half and shares the rest with them.
  async function feed(buddyId, foodId = holding) {
    if (!foodId || eating || feedLock.current) return;
    feedLock.current = true;
    const next = await window.__storage.feedBuddy(buddyId, foodId);
    if (!next) {
      feedLock.current = false;
      return;
    }
    setBasket(next);
    setHolding(null);
    if (isGolden(foodId)) {
      setPartyAll(true);
      timers.current.push(setTimeout(() => setPartyAll(false), 6000));
    }
    eat(buddyId, foodId, {
      then: () => {
        if (!next.sharedWith) {
          feedLock.current = false;
          return;
        }
        const line = "Sharing is caring!";
        setBubble(line);
        window.__audio.buddySay?.(line);
        timers.current.push(
          setTimeout(
            () =>
              eat(next.sharedWith, foodId, {
                shared: true,
                then: () => (feedLock.current = false),
              }),
            900,
          ),
        );
      },
    });
  }

  // Pick up a snack: drag it onto a Buddy and let go, or just tap it and then
  // tap a Buddy. Tapping the held snack again puts it back.
  function pickUp(e, foodId) {
    const wasHolding = holding === foodId;
    const start = { x: e.clientX, y: e.clientY };
    let moved = false;
    setHolding(foodId);
    function move(ev) {
      if (!moved && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) < 10)
        return;
      moved = true;
      setGhost({ x: ev.clientX, y: ev.clientY, id: foodId });
    }
    function up(ev) {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setGhost(null);
      const hit = document
        .elementsFromPoint(ev.clientX, ev.clientY)
        .find((el) => el.dataset?.feedId);
      if (hit) feed(hit.dataset.feedId, foodId);
      else if (moved || wasHolding) setHolding(null);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  }

  function changePose(next) {
    lastTouch.current = Date.now();
    setPoseState(next);
    setSavedPose(next);
  }

  function buddyTapped() {
    lastTouch.current = Date.now();
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
    <Screen allowOverflow max="max-w-2xl" className="relative">
      {/* The scene is the page itself, full bleed; the controls float on it. */}
      <HomeScene
        hour={hour}
        action={sleepy ? "wave" : action.id}
        bubble={bubble || greeting}
        presence={presence}
        knocking={knocking}
        cycle={cycle}
        onKnock={knock}
        holding={!!holding}
        fed={basket.fed}
        eatingId={eating}
        happyId={happy}
        eatingFood={foodById(eatingFoodId)}
        sharedEat={sharedEat}
        hungry={trayOpen}
        partyAll={partyAll}
        onFeed={feed}
        friends={friends.friends}
        onFriendPose={friends.setPose}
        onFriendDropped={friends.dropped}
        onKnockFriends={friends.wake}
      >
        <Buddy
          mood={buddyMood}
          color={buddyStyle.color}
          accessory={buddyStyle.accessory}
          size={110}
          walking={presence === "coming" || presence === "going" || arriving}
          facing={presence === "going" ? "left" : "right"}
          label="Buddy"
          snack={eating === "lead" ? foodById(eatingFoodId) : null}
          shared={sharedEat}
          onTap={buddyTapped}
          movable
          pose={pose}
          onPoseChange={changePose}
        />
      </HomeScene>

      <h1 className="t-hero !text-2xl sm:!text-4xl relative z-10 mt-1 self-center rounded-full bg-white/75 px-6 py-1 text-center shadow-sm backdrop-blur">
        My Spelling Buddy
      </h1>

      {trayOpen && basket.foods.length > 0 && (
        <div className="relative z-10 mt-3 flex items-center justify-center gap-2 self-center rounded-2xl bg-white/90 px-3 py-2 shadow-md backdrop-blur">
          <p className="text-sm font-semibold text-slate-600">
            Give a snack to a Buddy:
          </p>
          {basket.foods.map((id, i) => (
            <button
              key={`${id}-${i}`}
              type="button"
              aria-label={`Pick up ${foodById(id)?.label}`}
              aria-pressed={holding === id}
              onPointerDown={(e) => pickUp(e, id)}
              className={`touch-none select-none rounded-xl p-1 text-3xl transition active:scale-95 ${holding === id ? "bg-amber-200 ring-2 ring-amber-400" : "hover:bg-slate-100"}`}
            >
              {foodById(id)?.emoji}
            </button>
          ))}
        </div>
      )}

      {ghost && (
        <span
          className="food-ghost"
          style={{ left: ghost.x, top: ghost.y }}
          aria-hidden="true"
        >
          {foodById(ghost.id)?.emoji}
        </span>
      )}

      {latestList && (
        <div className="card relative z-10 mt-3 max-h-28 w-full overflow-y-auto bg-white/85 text-left backdrop-blur">
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

      <div className="flex-1" />

      <div className="relative z-10 flex w-full flex-row justify-center gap-3">
        <button
          type="button"
          onClick={() => onNavigate("lists", { mode: "practice" })}
          className="btn btn-go btn-hero !min-h-[3.5rem] !px-6 !py-3 flex-1 sm:max-w-xs"
        >
          Practise
        </button>
        <button
          type="button"
          onClick={() => onNavigate("parentMenu")}
          className="btn btn-secondary btn-hero !min-h-[3.5rem] !px-6 !py-3 flex-1 !text-xl sm:max-w-[12rem]"
        >
          Parents
        </button>
      </div>

      <div className="relative z-10 mt-3 flex flex-wrap justify-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate("dressUp")}
          className="btn btn-secondary btn-sm"
        >
          🎨 Dress up Buddy
        </button>
        {basket.foods.length > 0 && (
          <button
            type="button"
            onClick={toggleTray}
            className="btn btn-secondary btn-sm"
          >
            🧺{" "}
            {trayOpen
              ? "Close basket"
              : `Feed the Buddies (${basket.foods.length})`}
          </button>
        )}
        {stickersEnabled && (
          <button
            type="button"
            onClick={() => onNavigate("stickers")}
            className="btn btn-secondary btn-sm"
          >
            🎖️ My Stickers
          </button>
        )}
      </div>
    </Screen>
  );
}
