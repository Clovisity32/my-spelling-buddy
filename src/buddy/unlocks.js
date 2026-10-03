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

export const isUnlocked = (item, total) => item.threshold <= total;
