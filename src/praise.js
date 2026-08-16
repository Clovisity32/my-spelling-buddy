// Templates rather than plain strings, so praise can use the child's name
// (configurable in Parents → Child's name) without every entry needing one.
const PRAISE_TEMPLATES = [
  (name) => `Great try, ${name}!`,
  () => "You did it!",
  () => "Keep going — you're doing brilliantly!",
  () => "That's the spirit!",
  () => "Wonderful effort!",
  () => "Look at you go!",
  (name) => `So proud of you for trying, ${name}!`,
];

export function getRandomPraise(name = "there") {
  const template =
    PRAISE_TEMPLATES[Math.floor(Math.random() * PRAISE_TEMPLATES.length)];
  return template(name);
}
