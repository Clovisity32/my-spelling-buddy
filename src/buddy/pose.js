// Where Buddy has been dragged to and how far it's been turned. Kept at module
// level (not in a component) so the pose survives moving between screens
// during a sitting; it resets on reload, which keeps Buddy from ever getting
// permanently lost off in a corner.
// x/y in px, r in degrees, s a size multiplier.
export const ZERO_POSE = { x: 0, y: 0, r: 0, s: 1 };
export const MIN_SCALE = 0.6;
export const MAX_SCALE = 2;

let current = ZERO_POSE;

export function getPose() {
  return current;
}

export function setPose(next) {
  current = next;
}

export const isMoved = (p) =>
  p.x !== 0 || p.y !== 0 || p.r !== 0 || (p.s ?? 1) !== 1;
