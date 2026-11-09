// Christmas theme: snow, the lit tree, Santa outfits, presents and the carol.
// Pure data and date logic, so the audio and the screens can share it.

// The season opens on 9 November (the day it was added) and runs to the end of
// December, every year from 2026 on. It never starts earlier than that.
export const XMAS_START = { month: 10, day: 9 }; // month is 0-based: November
export const XMAS_FIRST_YEAR = 2026;

export function isChristmasSeason(date = new Date()) {
  const y = date.getFullYear();
  if (y < XMAS_FIRST_YEAR) return false;
  const m = date.getMonth();
  if (m === 11) return true;
  return m === XMAS_START.month && date.getDate() >= XMAS_START.day;
}

// `?xmas=1` / `?xmas=0` force it on or off (to preview and to test). Automated
// browsers get the plain scene unless they ask for it, so the other tests never
// see snow.
export function isChristmas() {
  try {
    const forced = new URLSearchParams(window.location.search).get("xmas");
    if (forced === "1") return true;
    if (forced === "0") return false;
    if (navigator.webdriver) return false;
  } catch {
    // fall through to the calendar
  }
  return isChristmasSeason();
}

// Santa, elf or reindeer: each colour of Buddy has its own Christmas look, so
// the five on screen aren't all dressed the same.
const OUTFITS = {
  peach: "santa",
  sky: "santa",
  rose: "santa",
  mint: "elf",
  butter: "elf",
  lavender: "reindeer",
  coral: "reindeer",
};
export const outfitFor = (color) => OUTFITS[color] || "santa";

// Five wrapped presents, one for each Buddy. The boxes are always the same
// colours, but what is inside changes every day: five surprises picked from a
// bigger pile (the same five all day, shuffled by the date).
const BOXES = [
  { id: "gift-red", hue: 0 },
  { id: "gift-gold", hue: 40 },
  { id: "gift-green", hue: 100 },
  { id: "gift-blue", hue: 190 },
  { id: "gift-purple", hue: 250 },
];
const PRIZES = [
  { prize: "🧸", label: "teddy bear" },
  { prize: "🚂", label: "toy train" },
  { prize: "🪁", label: "kite" },
  { prize: "🎸", label: "guitar" },
  { prize: "⚽", label: "ball" },
  { prize: "🎨", label: "paint set" },
  { prize: "🦄", label: "unicorn" },
  { prize: "🚀", label: "rocket" },
  { prize: "🎹", label: "piano" },
  { prize: "🧩", label: "puzzle" },
  { prize: "🎺", label: "trumpet" },
  { prize: "🐼", label: "panda" },
];

export function giftsForToday(date = new Date()) {
  // A small seeded shuffle: same date, same surprises.
  let seed = date.getFullYear() * 400 + date.getMonth() * 32 + date.getDate();
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const pool = [...PRIZES];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return BOXES.map((b, i) => ({ ...b, ...pool[i] }));
}
export const giftById = (id) => giftsForToday().find((g) => g.id === id);

// "Jingle Bells" (public domain), as [note, length] pairs; the lyric each
// phrase carries is shown in the speech bubble as it is sung.
const NOTE_HZ = { C: 523.25, D: 587.33, E: 659.25, F: 698.46, G: 783.99 };
const UNIT = 0.15; // seconds per length unit
const PHRASES = [
  {
    text: "Jingle bells, jingle bells,",
    notes: [
      ["E", 2],
      ["E", 2],
      ["E", 4],
      ["E", 2],
      ["E", 2],
      ["E", 4],
    ],
  },
  {
    text: "Jingle all the way!",
    notes: [
      ["E", 2],
      ["G", 2],
      ["C", 3],
      ["D", 1],
      ["E", 8],
    ],
  },
  {
    text: "Oh what fun it is to ride",
    notes: [
      ["F", 2],
      ["F", 2],
      ["F", 3],
      ["F", 1],
      ["F", 2],
      ["E", 2],
      ["E", 2],
    ],
  },
  {
    text: "In a one-horse open sleigh!",
    notes: [
      ["E", 1],
      ["E", 1],
      ["G", 2],
      ["G", 2],
      ["F", 2],
      ["D", 2],
      ["C", 8],
    ],
  },
];

// The scheduled tune: every note with its start and length in seconds, each
// lyric line with the ms it begins at, and the total length in ms.
export function buildCarol() {
  const notes = [];
  const lines = [];
  let t = 0;
  for (const p of PHRASES) {
    lines.push({ text: p.text, at: Math.round(t * UNIT * 1000) });
    for (const [n, len] of p.notes) {
      notes.push({ freq: NOTE_HZ[n], at: t * UNIT, dur: len * UNIT });
      t += len;
    }
  }
  const totalMs = Math.round(t * UNIT * 1000);
  lines.push({ text: "Merry Christmas, everyone!", at: totalMs });
  return { notes, lines, totalMs: totalMs + 1800 };
}

export const SNOW_COUNT = 36;
export const SNOW_COUNT_HEAVY = 80;
