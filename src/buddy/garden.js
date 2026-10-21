// Things that appear in the Home scene as practices add up — effort only, like
// stickers.js and unlocks.js, so derived from the practice count and never
// stored. `slot` places each on the lawn (see HomeScene's Garden).
export const GARDEN_UNLOCKS = [
  { id: "flowers", label: "Flower bed", emoji: "🌷", threshold: 12 },
  { id: "tree", label: "Apple tree", emoji: "🌳", threshold: 18 },
  { id: "mailbox", label: "Mailbox", emoji: "📮", threshold: 25 },
  { id: "slide", label: "Playground slide", emoji: "🛝", threshold: 35 },
  { id: "pond", label: "Duck pond", emoji: "🦆", threshold: 45 },
  { id: "rainbow", label: "Rainbow", emoji: "🌈", threshold: 60 },
  { id: "lights", label: "Fairy lights", emoji: "✨", threshold: 80 },
  { id: "fountain", label: "Fountain", emoji: "⛲", threshold: 100 },
];

export const gardenFor = (total) =>
  GARDEN_UNLOCKS.filter((g) => g.threshold <= total);
