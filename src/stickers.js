// Effort-based rewards: earned for completing a practice at all, regardless
// of how many words she got right. Gated on total completed sessions
// app-wide (not per-list) so every list's practice grows the same
// collection — derived from session data, not a separate rewards store, so
// there's nothing here that can drift out of sync with actual practice.
export const STICKERS = [
  { threshold: 1, emoji: "🌱", label: "First Practice" },
  { threshold: 3, emoji: "🐣", label: "Getting Started" },
  { threshold: 5, emoji: "🦋", label: "Five Times!" },
  { threshold: 10, emoji: "🌟", label: "Ten Times!" },
  { threshold: 15, emoji: "🎈", label: "Practice Pro" },
  { threshold: 20, emoji: "🚀", label: "Twenty Times!" },
  { threshold: 30, emoji: "🏅", label: "Dedicated Speller" },
  { threshold: 50, emoji: "👑", label: "Spelling Champion" },
  { threshold: 75, emoji: "🐬", label: "Seventy-Five!" },
  { threshold: 100, emoji: "💯", label: "One Hundred!" },
  { threshold: 125, emoji: "🦄", label: "Magic Speller" },
  { threshold: 150, emoji: "🌈", label: "Rainbow Writer" },
  { threshold: 200, emoji: "🏰", label: "Spelling Castle" },
  { threshold: 250, emoji: "🐉", label: "Dragon Speller" },
  { threshold: 300, emoji: "🌍", label: "Around the World" },
  { threshold: 365, emoji: "🎂", label: "A Whole Year!" },
  { threshold: 500, emoji: "💎", label: "Diamond Speller" },
];

// After the last fixed sticker there is always another: a Superstar every 100
// practices, forever, so the collection never "finishes".
const LAST_FIXED = STICKERS[STICKERS.length - 1].threshold;
const SUPERSTAR_EVERY = 100;

const superstar = (threshold) => ({
  threshold,
  emoji: "⭐",
  label: `Superstar ${threshold}`,
});

const isSuperstar = (n) => n > LAST_FIXED && n % SUPERSTAR_EVERY === 0;


export function getEarnedStickers(totalCompletedSessions) {
  const earned = STICKERS.filter((s) => s.threshold <= totalCompletedSessions);
  for (
    let n = LAST_FIXED + SUPERSTAR_EVERY;
    n <= totalCompletedSessions;
    n += SUPERSTAR_EVERY
  )
    earned.push(superstar(n));
  return earned;
}

// The next sticker still to be earned (always one: see Superstar above).
export function getNextSticker(totalCompletedSessions) {
  const next = STICKERS.find((s) => s.threshold > totalCompletedSessions);
  if (next) return next;
  return superstar(
    (Math.floor(totalCompletedSessions / SUPERSTAR_EVERY) + 1) *
      SUPERSTAR_EVERY,
  );
}

// The one sticker unlocked by *this* session, if the total just crossed a
// threshold — used for the "you just earned a new sticker" moment on
// Celebration. null on every session that isn't itself a milestone.
export function getJustEarnedSticker(totalCompletedSessions) {
  return (
    STICKERS.find((s) => s.threshold === totalCompletedSessions) ||
    (isSuperstar(totalCompletedSessions)
      ? superstar(totalCompletedSessions)
      : null)
  );
}
