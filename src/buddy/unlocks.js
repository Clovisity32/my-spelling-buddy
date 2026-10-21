import { GARDEN_UNLOCKS } from "./garden.js";

// What Buddy can wear, unlocked by completed practices — effort only, same
// idea as stickers.js. Derived from the session count, not stored.
export const COLOR_UNLOCKS = [
  { id: "peach", label: "Peach", threshold: 0 },
  { id: "mint", label: "Mint", threshold: 0 },
  { id: "sky", label: "Sky", threshold: 1 },
  { id: "lavender", label: "Lavender", threshold: 2 },
  { id: "butter", label: "Butter", threshold: 3 },
  { id: "rose", label: "Rose", threshold: 5 },
  { id: "coral", label: "Coral", threshold: 8 },
];

export const ACCESSORY_UNLOCKS = [
  { id: "none", label: "Nothing", emoji: "🙂", threshold: 0 },
  { id: "crown", label: "Crown", emoji: "👑", threshold: 1 },
  { id: "glasses", label: "Sunglasses", emoji: "🕶️", threshold: 2 },
  { id: "hat", label: "Party hat", emoji: "🎉", threshold: 4 },
  { id: "flower", label: "Flower", emoji: "🌸", threshold: 6 },
  { id: "headphones", label: "Headphones", emoji: "🎧", threshold: 8 },
];

// The four small friends can be dressed up too, one wardrobe at a time. Once a
// friend's wardrobe is open it can wear any accessory Buddy has unlocked.
export const FRIEND_WARDROBE_UNLOCKS = [
  { id: "lavender", label: "Lavender", threshold: 35 },
  { id: "mint", label: "Mint", threshold: 40 },
  { id: "butter", label: "Butter", threshold: 45 },
  { id: "rose", label: "Rose", threshold: 50 },
];

export const isUnlocked = (item, total) => item.threshold <= total;

// Everything that opens exactly at this practice count (none for 0), for the
// "Buddy has something new!" moment on Celebration.
export function getJustUnlocked(total) {
  if (total <= 0) return [];
  return [
    ...COLOR_UNLOCKS.filter((c) => c.threshold === total).map((c) => ({
      id: c.id,
      label: `${c.label} colour`,
      emoji: "🎨",
    })),
    ...ACCESSORY_UNLOCKS.filter((a) => a.threshold === total).map((a) => ({
      id: a.id,
      label: a.label,
      emoji: a.emoji,
    })),
    ...GARDEN_UNLOCKS.filter((g) => g.threshold === total).map((g) => ({
      id: `garden-${g.id}`,
      label: `${g.label} in the garden`,
      emoji: g.emoji,
    })),
    ...FRIEND_WARDROBE_UNLOCKS.filter((f) => f.threshold === total).map(
      (f) => ({
        id: `wardrobe-${f.id}`,
        label: `${f.label} friend's wardrobe`,
        emoji: "👗",
      }),
    ),
  ];
}
