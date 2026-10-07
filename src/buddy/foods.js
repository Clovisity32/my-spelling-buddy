// The snacks that come in a basket. A basket holds BASKET_SIZE different ones.
export const FOODS = [
  { id: "apple", emoji: "🍎", label: "apple" },
  { id: "carrot", emoji: "🥕", label: "carrot" },
  { id: "cookie", emoji: "🍪", label: "cookie" },
  { id: "strawberry", emoji: "🍓", label: "strawberry" },
  { id: "banana", emoji: "🍌", label: "banana" },
  { id: "cupcake", emoji: "🧁", label: "cupcake" },
];

export const BASKET_SIZE = 4;

export const foodById = (id) => FOODS.find((f) => f.id === id);

export function pickBasketFoods() {
  const pool = [...FOODS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, BASKET_SIZE).map((f) => f.id);
}
