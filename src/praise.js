const PRAISE = [
  "Great try, Chloe!",
  "You did it!",
  "Keep going — you're doing brilliantly!",
  "That's the spirit!",
  "Wonderful effort!",
  "Look at you go!",
  "So proud of you for trying!",
];

export function getRandomPraise() {
  return PRAISE[Math.floor(Math.random() * PRAISE.length)];
}
