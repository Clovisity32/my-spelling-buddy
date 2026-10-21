// The snacks that come in a basket. A basket holds BASKET_SIZE different ones —
// one for each Buddy. `crumb` is the colour of the crumbs that fly when it is
// bitten.
export const FOODS = [
  { id: "apple", emoji: "🍎", label: "apple", crumb: "#e8483f" },
  { id: "carrot", emoji: "🥕", label: "carrot", crumb: "#f28a2e" },
  { id: "cookie", emoji: "🍪", label: "cookie", crumb: "#b87a3d" },
  { id: "strawberry", emoji: "🍓", label: "strawberry", crumb: "#e5384f" },
  { id: "banana", emoji: "🍌", label: "banana", crumb: "#f2d04a" },
  { id: "cupcake", emoji: "🧁", label: "cupcake", crumb: "#f48fb1" },
  { id: "watermelon", emoji: "🍉", label: "watermelon", crumb: "#ef5a6f" },
  { id: "pretzel", emoji: "🥨", label: "pretzel", crumb: "#c98b4a" },
];

// A special treat that comes in the basket for every 10th practice. Feeding it
// to one Buddy makes everyone dance.
export const GOLDEN_FOODS = [
  { id: "golden-cake", emoji: "🎂", label: "golden cake", crumb: "#ffd54a" },
  {
    id: "golden-icecream",
    emoji: "🍦",
    label: "golden ice cream",
    crumb: "#ffe28a",
  },
];

// Everyone who can be fed: Chloe's own Buddy ("lead") and the four friends.
export const BUDDY_IDS = ["lead", "lavender", "mint", "butter", "rose"];

export const BASKET_SIZE = BUDDY_IDS.length;
export const GOLDEN_EVERY = 10;

export const foodById = (id) =>
  FOODS.find((f) => f.id === id) || GOLDEN_FOODS.find((f) => f.id === id);

export const isGolden = (id) => GOLDEN_FOODS.some((f) => f.id === id);

export const isGoldenPractice = (total) =>
  total > 0 && total % GOLDEN_EVERY === 0;

function shuffled(list) {
  const pool = [...list];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

export function pickBasketFoods({ golden = false } = {}) {
  const foods = shuffled(FOODS)
    .slice(0, BASKET_SIZE)
    .map((f) => f.id);
  if (golden) foods.push(shuffled(GOLDEN_FOODS)[0].id);
  return foods;
}
