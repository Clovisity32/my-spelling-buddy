import { useEffect, useReducer, useRef } from "react";
import { ZERO_POSE } from "./pose.js";

// The four small friends: where each stands on the lawn, whether it is walking,
// and whether it is out or inside the cottage. `t` is the position along the
// lawn (0 = by Buddy's house, 1 = the cottage door). Kept at module level like
// pose.js so it survives moving between screens, and resets on reload.
export const FRIEND_COLORS = ["lavender", "mint", "butter", "rose"];

const START_T = { lavender: 0.05, mint: 0.3, butter: 0.55, rose: 0.8 };
const MIN_GAP = 0.12;
const MAX_T = 0.92; // dragged friends stop short of the door

const fresh = () =>
  Object.fromEntries(
    FRIEND_COLORS.map((c) => [
      c,
      {
        t: START_T[c],
        presence: "out", // out | going | in | coming
        walking: false,
        facing: "left",
        dur: 0, // seconds the current walk takes
        pose: ZERO_POSE,
        snap: false,
        lifted: false,
      },
    ]),
  );

let store = fresh();

const rand = (lo, hi) => lo + Math.random() * (hi - lo);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

// roam: wander on their own (off in the test browser and for reduced motion).
// night: everyone heads indoors. tray: the snack tray is open — no wandering,
// and anyone indoors who hasn't eaten comes out. fast: short timers for
// previewing (`?roam=fast`).
export default function useFriends({
  roam,
  night,
  tray,
  fed = [],
  fast = false,
}) {
  const [, bump] = useReducer((n) => n + 1, 0);
  const timers = useRef([]);
  const dragging = useRef(new Set());
  const fedRef = useRef(fed);
  fedRef.current = fed;

  function patch(color, change) {
    store = { ...store, [color]: { ...store[color], ...change } };
    bump();
  }

  function later(fn, ms) {
    timers.current.push(setTimeout(fn, ms));
  }

  // A walk in progress when the screen was left can't finish: settle it.
  useEffect(() => {
    for (const c of FRIEND_COLORS) {
      const f = store[c];
      patch(c, {
        presence:
          f.presence === "going"
            ? "in"
            : f.presence === "coming"
              ? "out"
              : f.presence,
        walking: false,
        dur: 0,
        pose: ZERO_POSE,
        snap: false,
        lifted: false,
      });
    }
    return () => timers.current.forEach(clearTimeout);
  }, []);

  function pickT(color) {
    const others = FRIEND_COLORS.filter(
      (c) => c !== color && store[c].presence !== "in",
    ).map((c) => store[c].t);
    for (let i = 0; i < 10; i++) {
      const t = rand(0, 0.9);
      if (others.every((o) => Math.abs(o - t) >= MIN_GAP)) return t;
    }
    return rand(0, 0.9);
  }

  function walkTo(color, t, change = {}) {
    const from = store[color].t;
    const dur = Math.max(0.8, Math.abs(t - from) * (fast ? 4 : 9));
    patch(color, {
      ...change,
      t,
      dur,
      walking: true,
      facing: t < from ? "left" : "right",
    });
    return dur * 1000;
  }

  function goHome(color) {
    const ms = walkTo(color, 1, { presence: "going" });
    later(() => patch(color, { presence: "in", walking: false }), ms + 100);
  }

  function comeOut(color) {
    patch(color, { presence: "coming", t: 1, dur: 0, walking: false });
    later(() => {
      const ms = walkTo(color, pickT(color));
      later(() => patch(color, { presence: "out", walking: false }), ms);
    }, 80);
  }

  // A knock on the cottage door: one friend who was indoors comes out.
  function wake() {
    const asleep = FRIEND_COLORS.filter((c) => store[c].presence === "in");
    if (asleep.length) comeOut(pick(asleep));
  }

  // Indoors at night from the start, rather than all walking in at once.
  useEffect(() => {
    if (!roam || !night) return;
    for (const c of FRIEND_COLORS)
      patch(c, { presence: "in", t: 1, dur: 0, walking: false });
  }, [roam, night]);

  // The snack tray is open: hungry friends indoors come out to be fed.
  useEffect(() => {
    if (!tray) return;
    for (const c of FRIEND_COLORS)
      if (store[c].presence === "in" && !fedRef.current.includes(c)) comeOut(c);
  }, [tray]);

  useEffect(() => {
    if (!roam || tray) return undefined;
    let id;
    function step() {
      const free = FRIEND_COLORS.filter((c) => !dragging.current.has(c));
      const out = free.filter((c) => store[c].presence === "out");
      if (night) {
        if (out.length) goHome(pick(out));
        return;
      }
      const c = pick(
        free.filter((x) => ["in", "out"].includes(store[x].presence)),
      );
      if (!c) return;
      if (store[c].presence === "in") {
        if (Math.random() < 0.8) comeOut(c);
        return;
      }
      const r = Math.random();
      if (r < 0.6) {
        const ms = walkTo(c, pickT(c));
        later(() => patch(c, { walking: false }), ms);
      } else if (r < 0.8) goHome(c);
    }
    function tick() {
      step();
      id = setTimeout(tick, (fast ? rand(2, 4) : rand(5, 10)) * 1000);
    }
    id = setTimeout(tick, (fast ? 2 : 4) * 1000);
    return () => clearTimeout(id);
  }, [roam, night, tray, fast]);

  // Picked up: follows the finger, standing still.
  function setPose(color, pose) {
    dragging.current.add(color);
    patch(color, { pose, walking: false, lifted: true });
  }

  // Put down: the distance it was carried becomes its new place on the lawn
  // (swapped in without a glide so nothing jumps), then it drops back to the
  // ground with a bounce and carries on wandering from there.
  function dropped(color, laneWidthPx) {
    const f = store[color];
    const t = Math.min(
      MAX_T,
      Math.max(0, f.t + (laneWidthPx > 0 ? f.pose.x / laneWidthPx : 0)),
    );
    patch(color, {
      t,
      dur: 0,
      snap: true,
      pose: { ...f.pose, x: 0 },
    });
    later(() => {
      patch(color, { snap: false, pose: ZERO_POSE });
      later(() => {
        dragging.current.delete(color);
        patch(color, { lifted: false });
      }, 500);
    }, 40);
  }

  return { friends: store, setPose, dropped, wake };
}
