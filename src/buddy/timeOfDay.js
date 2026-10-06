// Which part of the day it is, for the Home scene's sky.
//
// `?hour=22` in the URL overrides the clock — handy for checking how the
// scene looks at night without waiting for it.
export function currentHour(now = new Date()) {
  try {
    const forced = new URLSearchParams(window.location.search).get("hour");
    if (forced !== null && forced !== "" && !Number.isNaN(Number(forced))) {
      return ((Number(forced) % 24) + 24) % 24;
    }
  } catch {
    // No window (or a malformed URL) — use the real clock.
  }
  return now.getHours() + now.getMinutes() / 60;
}

// night 20–5, dawn 5–8, day 8–17, dusk 17–20
export function phaseOf(hour) {
  if (hour >= 20 || hour < 5) return "night";
  if (hour < 8) return "dawn";
  if (hour < 17) return "day";
  return "dusk";
}

// Where the sun (6–18h) or moon (18–6h) sits along its arc: x in 0..1 from
// left to right, and y in 0..1 where 0 is the top of the sky.
export function celestialPosition(hour) {
  const isSun = hour >= 6 && hour < 18;
  const t = isSun ? (hour - 6) / 12 : ((hour + 6) % 24) / 12;
  return {
    body: isSun ? "sun" : "moon",
    x: t,
    y: 1 - Math.sin(Math.PI * t) * 0.8,
  };
}

// A different pick for each calendar day (local time), so what Buddy does when
// it comes out of the house changes every day but is stable within one.
export function dayNumber(now = new Date()) {
  return Math.floor(
    (now.getTime() - now.getTimezoneOffset() * 60000) / 86400000,
  );
}

// Automated browsers get a motionless scene (Buddy already standing in its
// spot) so tests can aim at it; `?scene=live` turns the door entrance back on.
export function sceneIsStill() {
  try {
    if (new URLSearchParams(window.location.search).get("scene") === "live") {
      return false;
    }
    return !!navigator.webdriver;
  } catch {
    return false;
  }
}
