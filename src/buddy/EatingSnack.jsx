// A snack being eaten, drawn over its eater's mouth: it pops up to the mouth,
// gets three bites taken out of it (each one flings a couple of crumbs in the
// snack's own colour that fall away), and is gone. `half` is a shared snack: it
// arrives already bitten, and smaller.
// Position is the mouth's: the middle of the Buddy's box (see Buddy.jsx).
const CRUMBS = [
  { dx: -30, delay: 0.75 },
  { dx: 26, delay: 0.8 },
  { dx: -20, delay: 1.35 },
  { dx: 32, delay: 1.4 },
  { dx: -34, delay: 1.95 },
  { dx: 16, delay: 2.0 },
];

export default function EatingSnack({ food, half = false }) {
  return (
    <span
      className={`eat-snack${half ? " eat-snack--half" : ""}`}
      data-eating-food={food.id}
      aria-hidden="true"
    >
      <span className="eat-snack-food">{food.emoji}</span>
      {CRUMBS.map((c, i) => (
        <span
          key={i}
          className="eat-crumb"
          style={{
            "--dx": `${c.dx}px`,
            "--dy": `${22 + (i % 3) * 8}px`,
            animationDelay: `${c.delay}s`,
            background: food.crumb,
          }}
        />
      ))}
    </span>
  );
}
