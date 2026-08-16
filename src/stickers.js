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
];

export function getEarnedStickers(totalCompletedSessions) {
  return STICKERS.filter((s) => s.threshold <= totalCompletedSessions);
}

// The one sticker unlocked by *this* session, if the total just crossed a
// threshold — used for the "you just earned a new sticker" moment on
// Celebration. null on every session that isn't itself a milestone.
export function getJustEarnedSticker(totalCompletedSessions) {
  return STICKERS.find((s) => s.threshold === totalCompletedSessions) || null;
}
