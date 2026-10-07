import { useEffect, useId, useRef, useState } from "react";
import "./buddy.css";
import { MIN_SCALE, MAX_SCALE } from "./pose.js";

// Pastel family, one per member of Chloe's drawing.
export const BUDDY_COLORS = {
  peach: { body: "#ffd9c2", edge: "#e8a98a", ear: "#ffb3a7" },
  mint: { body: "#c9f2dc", edge: "#8fcfae", ear: "#f7b5c8" },
  lavender: { body: "#e3d6fa", edge: "#b6a0e0", ear: "#f7b5c8" },
  sky: { body: "#cfe8fb", edge: "#93c3e8", ear: "#f7b5c8" },
  butter: { body: "#fff0b8", edge: "#e6cd72", ear: "#ffb3a7" },
  rose: { body: "#ffd0e0", edge: "#eb98b6", ear: "#ffa0b8" },
  coral: { body: "#ffc9c0", edge: "#e8948a", ear: "#ffe0a0" },
};

// spinx/spiny/spinz/tumble turn the whole body in 3D around each axis.
const REACTIONS = [
  "jump",
  "spin",
  "ears",
  "heart",
  "spinx",
  "spiny",
  "spinz",
  "tumble",
];

// Position lives on an outer <g> and the animation class on the inner path:
// a CSS animation's `transform` replaces an SVG transform attribute on the
// same element, which would throw the heart to the origin.
function Heart({ x, y, size = 1, fill = "#ff5c7a", className, style }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path
        className={className}
        style={style}
        d="M0 8 C-14 -2 -8 -14 0 -6 C8 -14 14 -2 0 8 Z"
        fill={fill}
        stroke="#d93a5c"
        strokeWidth={1.5 / size}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Accessory({ kind }) {
  switch (kind) {
    case "crown":
      return (
        <path
          d="M72 40 L78 12 L90 28 L100 6 L110 28 L122 12 L128 40 Z"
          fill="#ffd54a"
          stroke="#d9a400"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      );
    case "glasses":
      return (
        <g fill="#2b2b3a" stroke="#2b2b3a" strokeWidth="3">
          <rect x="52" y="108" width="40" height="24" rx="10" />
          <rect x="108" y="108" width="40" height="24" rx="10" />
          <path d="M92 118 L108 118" fill="none" />
          <path d="M60 114 L70 112" stroke="#fff" opacity="0.6" />
        </g>
      );
    case "hat":
      return (
        <g stroke="#b04a9c" strokeWidth="3" strokeLinejoin="round">
          <path d="M70 40 L100 -18 L130 40 Z" fill="#ff9ad5" />
          <circle cx="100" cy="-20" r="7" fill="#ffd54a" />
          <path d="M82 22 L118 22" stroke="#fff" strokeWidth="4" />
        </g>
      );
    case "flower":
      return (
        <g transform="translate(140 34)">
          {[0, 72, 144, 216, 288].map((a) => (
            <circle
              key={a}
              cx="0"
              cy="-9"
              r="7"
              fill="#ff9ec4"
              stroke="#e0709b"
              strokeWidth="1.5"
              transform={`rotate(${a})`}
            />
          ))}
          <circle r="5" fill="#ffd54a" />
        </g>
      );
    case "headphones":
      return (
        <g fill="none" stroke="#4a5568" strokeWidth="5" strokeLinecap="round">
          <path d="M30 98 Q30 28 100 28 Q170 28 170 98" />
          <rect x="22" y="92" width="16" height="30" rx="7" fill="#ff7a7a" />
          <rect x="162" y="92" width="16" height="30" rx="7" fill="#ff7a7a" />
        </g>
      );
    default:
      return null;
  }
}

// mood: idle | wave | listen | slow | cheer | love | dance | sleepy | chew
// lookAt: {x, y} in -1..1 — pupils follow it, in any mood, so Buddy can
// watch the pencil while otherwise idle.
export default function Buddy({
  mood = "idle",
  color = "peach",
  accessory = "none",
  size = 160,
  lookAt = null,
  pitch = 1,
  onTap,
  label = "Buddy",
  className = "",
  // Drag to move, two-finger twist (or mouse wheel) to rotate. `pose` is
  // {x, y, r} in px/degrees and is controlled by the parent so it can offer a
  // "put Buddy back" button.
  movable = false,
  pose = null,
  onPoseChange = null,
}) {
  const [reaction, setReaction] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [lean, setLean] = useState(0);
  const el = useRef(null);
  const pointers = useRef(new Map());
  const gesture = useRef(null);
  const dragged = useRef(false);
  const poseRef = useRef({ x: 0, y: 0, r: 0, s: 1 });
  poseRef.current = pose || poseRef.current;
  // Squishing: pressed = finger is down (squash), hugging = held long
  // enough to become a cuddle (happy closed eyes, hearts, purr), boing = the
  // spring back after letting go.
  const [pressed, setPressed] = useState(false);
  const [hugging, setHugging] = useState(false);
  const [boing, setBoing] = useState(false);
  const timer = useRef(null);
  const holdTimer = useRef(null);
  const boingTimer = useRef(null);
  const stopPurr = useRef(null);
  // "none" | "hugging" | "hugged" — "hugged" survives until the click that
  // follows the release, so that click is not mistaken for a tap.
  const hugState = useRef("none");
  const uid = useId().replace(/:/g, "");
  const palette = BUDDY_COLORS[color] || BUDDY_COLORS.peach;
  const open =
    !hugging && (mood === "cheer" || mood === "love" || reaction === "jump");
  const showHearts =
    hugging || mood === "cheer" || mood === "love" || reaction === "heart";
  const px = lookAt ? lookAt.x * 4 : 0;
  const py = lookAt ? lookAt.y * 3 : 0;

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      clearTimeout(holdTimer.current);
      clearTimeout(boingTimer.current);
      stopPurr.current?.();
    },
    [],
  );

  function press() {
    setPressed(true);
    hugState.current = "none";
    clearTimeout(holdTimer.current);
    holdTimer.current = setTimeout(async () => {
      hugState.current = "hugging";
      setHugging(true);
      const stop = await window.__audio?.startBuddyPurr?.();
      // Released while the purr was still starting up: stop it right away.
      if (hugState.current === "hugging") stopPurr.current = stop;
      else stop?.();
    }, 500);
  }

  function release() {
    clearTimeout(holdTimer.current);
    if (!pressed) return;
    setPressed(false);
    setBoing(true);
    clearTimeout(boingTimer.current);
    boingTimer.current = setTimeout(() => setBoing(false), 700);
    if (hugState.current === "hugging") {
      hugState.current = "hugged";
      stopPurr.current?.();
      stopPurr.current = null;
      setHugging(false);
      window.__audio?.playBuddyAww?.();
    }
  }

  // Abandon a press without the hug "aww" or the spring-back — used when the
  // press turns out to be a drag or a twist.
  function cancelPress() {
    clearTimeout(holdTimer.current);
    hugState.current = "none";
    stopPurr.current?.();
    stopPurr.current = null;
    setHugging(false);
    setPressed(false);
  }

  const distanceBetween = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(b.x - a.x, b.y - a.y);
  };

  const angleBetween = () => {
    const [a, b] = [...pointers.current.values()];
    return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  };

  function onDown(e) {
    if (!movable) return press();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Synthetic or already-gone pointer — dragging still works without it.
    }
    if (pointers.current.size === 2) {
      cancelPress();
      dragged.current = true;
      setDragging(true);
      gesture.current = {
        type: "twist",
        startAngle: angleBetween(),
        startRot: poseRef.current.r,
        startDist: Math.max(distanceBetween(), 1),
        startScale: poseRef.current.s ?? 1,
      };
      return;
    }
    const rect = el.current.getBoundingClientRect();
    const start = poseRef.current;
    gesture.current = {
      type: "drag",
      x: e.clientX,
      y: e.clientY,
      start: { ...start },
      // Where Buddy sits with no offset, so it can be kept inside the screen.
      baseLeft: rect.left - start.x,
      baseTop: rect.top - start.y,
      w: rect.width,
      h: rect.height,
      moved: false,
    };
    press();
  }

  function onMove(e) {
    const g = gesture.current;
    if (!movable || !g || !pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.type === "twist") {
      if (pointers.current.size < 2) return;
      onPoseChange?.({
        ...poseRef.current,
        r: g.startRot + (angleBetween() - g.startAngle),
        // Pinch: fingers apart grows Buddy, together shrinks it — within a
        // sensible range so it can't vanish or fill the screen.
        s: Math.min(
          MAX_SCALE,
          Math.max(MIN_SCALE, g.startScale * (distanceBetween() / g.startDist)),
        ),
      });
      return;
    }
    const dx = e.clientX - g.x;
    const dy = e.clientY - g.y;
    if (!g.moved) {
      if (Math.hypot(dx, dy) < 8) return;
      g.moved = true;
      dragged.current = true;
      cancelPress();
      setDragging(true);
      window.__audio?.playBuddyGiggle?.(pitch); // a little "pika!" on pick-up
    }
    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    onPoseChange?.({
      ...poseRef.current,
      x: clamp(
        g.start.x + dx,
        -g.baseLeft,
        window.innerWidth - g.baseLeft - g.w,
      ),
      y: clamp(
        g.start.y + dy,
        -g.baseTop,
        window.innerHeight - g.baseTop - g.h,
      ),
    });
    setLean(clamp((e.movementX || 0) * 1.5, -14, 14));
  }

  function onUp(e) {
    if (!movable) return release();
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size > 0) return; // still one finger down after a twist
    gesture.current = null;
    if (g && (g.type === "twist" || g.moved)) {
      setDragging(false);
      setLean(0);
      setBoing(true);
      clearTimeout(boingTimer.current);
      boingTimer.current = setTimeout(() => setBoing(false), 700);
      // The click that follows this release must not count as a tap.
      setTimeout(() => (dragged.current = false), 0);
      return;
    }
    release();
  }

  function onWheel(e) {
    if (!movable) return;
    const cur = poseRef.current;
    // Trackpad pinch arrives as ctrl+wheel: resize. A plain wheel turns it.
    if (e.ctrlKey) {
      const s = (cur.s ?? 1) * Math.exp(-e.deltaY * 0.01);
      onPoseChange?.({
        ...cur,
        s: Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)),
      });
      return;
    }
    onPoseChange?.({ ...cur, r: cur.r + e.deltaY * 0.15 });
  }

  function tap() {
    if (dragged.current) return;
    // A long hold was a hug, not a tap — don't also fire a tap reaction.
    if (hugState.current === "hugged") {
      hugState.current = "none";
      return;
    }
    const r = REACTIONS[Math.floor(Math.random() * REACTIONS.length)];
    setReaction(r);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setReaction(null), 1300);
    window.__audio?.playBuddyGiggle?.(pitch);
    onTap?.(r);
  }

  const classes = [
    "buddy",
    `buddy--${mood}`,
    reaction ? `buddy--r-${reaction}` : "",
    pressed ? "buddy--pressed" : "",
    boing ? "buddy--boing" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      onClick={tap}
      aria-label={label}
      data-buddy-mood={hugging ? "hug" : reaction ? `r-${reaction}` : mood}
      ref={el}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={movable ? undefined : release}
      onPointerCancel={onUp}
      onWheel={onWheel}
      onContextMenu={(e) => e.preventDefault()}
      className={classes}
      data-buddy-scale={movable && pose ? (pose.s ?? 1).toFixed(2) : undefined}
      data-buddy-pose={
        movable && pose
          ? `${Math.round(pose.x)},${Math.round(pose.y)},${Math.round(pose.r)}`
          : undefined
      }
      style={{
        width: size,
        height: size * 1.5,
        background: "none",
        border: 0,
        padding: 0,
        ...(movable && {
          // A transform, so moving Buddy never reflows the screen. Lean tips
          // it into the direction of travel while it's being carried.
          transform: `translate(${(pose || poseRef.current).x}px, ${(pose || poseRef.current).y}px) rotate(${(pose || poseRef.current).r + lean}deg) scale(${(pose || poseRef.current).s ?? 1})`,
          transition: dragging ? "none" : "transform 0.35s ease-out",
          position: "relative",
          zIndex: 30,
          touchAction: "none",
          cursor: dragging ? "grabbing" : "grab",
        }),
      }}
    >
      <svg
        className="buddy-3d"
        viewBox="0 0 200 300"
        width="100%"
        height="100%"
        aria-hidden="true"
      >
        <defs>
          {/* Soft light from the top-left and a deeper rim at the edges: a
              flat fill reads as a sticker, this reads as a plush toy. */}
          <radialGradient id={`${uid}-hi`} cx="38%" cy="28%" r="62%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${uid}-rim`} cx="50%" cy="45%" r="62%">
            <stop offset="62%" stopColor={palette.edge} stopOpacity="0" />
            <stop offset="100%" stopColor={palette.edge} stopOpacity="0.45" />
          </radialGradient>
        </defs>

        {/* soft ground shadow */}
        <ellipse cx="100" cy="298" rx="78" ry="7" fill="#000" opacity="0.08" />

        {/* feet with toe beans */}
        <g>
          <ellipse
            cx="62"
            cy="286"
            rx="30"
            ry="14"
            fill={palette.body}
            stroke={palette.edge}
            strokeWidth="3"
          />
          <ellipse
            cx="138"
            cy="286"
            rx="30"
            ry="14"
            fill={palette.body}
            stroke={palette.edge}
            strokeWidth="3"
          />
          {[
            [52, 282],
            [62, 278],
            [72, 282],
          ].map(([cx, cy], i) => (
            <circle key={`l${i}`} cx={cx} cy={cy} r="4" fill={palette.ear} />
          ))}
          {[
            [128, 282],
            [138, 278],
            [148, 282],
          ].map(([cx, cy], i) => (
            <circle key={`r${i}`} cx={cx} cy={cy} r="4" fill={palette.ear} />
          ))}
          <ellipse cx="62" cy="291" rx="9" ry="5" fill={palette.ear} />
          <ellipse cx="138" cy="291" rx="9" ry="5" fill={palette.ear} />
        </g>

        <g className="buddy-squish">
          <g className="buddy-bob">
            {/* ears */}
            <g className="buddy-ear-l">
              <circle
                cx="55"
                cy="58"
                r="24"
                fill={palette.body}
                stroke={palette.edge}
                strokeWidth="3"
              />
              <circle cx="55" cy="60" r="12" fill={palette.ear} />
            </g>
            <g className="buddy-ear-r">
              <circle
                cx="145"
                cy="58"
                r="24"
                fill={palette.body}
                stroke={palette.edge}
                strokeWidth="3"
              />
              <circle cx="145" cy="60" r="12" fill={palette.ear} />
            </g>

            {/* bean body */}
            <path
              d="M28 280 C14 160 30 36 100 36 C170 36 186 160 172 280 Q100 296 28 280 Z"
              fill={palette.body}
              stroke={palette.edge}
              strokeWidth="3.5"
              strokeLinejoin="round"
            />
            <path
              d="M28 280 C14 160 30 36 100 36 C170 36 186 160 172 280 Q100 296 28 280 Z"
              fill={`url(#${uid}-hi)`}
            />
            <path
              d="M28 280 C14 160 30 36 100 36 C170 36 186 160 172 280 Q100 296 28 280 Z"
              fill={`url(#${uid}-rim)`}
            />
            {/* lighter, fluffy tummy */}
            <ellipse
              cx="100"
              cy="212"
              rx="50"
              ry="58"
              fill="#fff"
              opacity="0.32"
            />

            {/* the little curly tuft with its bow */}
            <path
              d="M100 38 C92 18 104 10 108 22 C112 12 124 18 112 38"
              fill={palette.ear}
              stroke={palette.edge}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle
              cx="100"
              cy="36"
              r="4"
              fill="#ff5c7a"
              stroke="#d93a5c"
              strokeWidth="1.5"
            />

            {/* eyes */}
            {hugging ? (
              <g
                fill="none"
                stroke="#555"
                strokeWidth="4"
                strokeLinecap="round"
              >
                <path d="M58 124 Q72 106 86 124" />
                <path d="M114 124 Q128 106 142 124" />
              </g>
            ) : (
              <g className="buddy-eyes">
                {[72, 128].map((cx) => (
                  <g key={cx}>
                    <circle
                      cx={cx}
                      cy="120"
                      r="13"
                      fill="#fff"
                      stroke="#555"
                      strokeWidth="2.5"
                    />
                    <circle cx={cx + px} cy={122 + py} r="8" fill="#3b3b4f" />
                    <circle cx={cx + px + 3} cy={118 + py} r="3" fill="#fff" />
                  </g>
                ))}
              </g>
            )}

            {mood === "sleepy" && (
              <g fill={palette.body} stroke="#555" strokeWidth="2.5">
                {[72, 128].map((cx) => (
                  <path
                    key={cx}
                    d={`M${cx - 14} 118 L${cx + 14} 118 L${cx + 14} 112 Q${cx} 100 ${cx - 14} 112 Z`}
                  />
                ))}
              </g>
            )}

            {/* cheeks */}
            <ellipse
              cx="52"
              cy="148"
              rx="11"
              ry="7"
              fill="#ff9db4"
              opacity={hugging || mood === "love" ? 0.95 : 0.6}
            />
            <ellipse
              cx="148"
              cy="148"
              rx="11"
              ry="7"
              fill="#ff9db4"
              opacity={hugging || mood === "love" ? 0.95 : 0.6}
            />

            {/* mouth */}
            {open ? (
              <g>
                <path
                  d="M82 148 Q100 180 118 148 Z"
                  fill="#7a2a3a"
                  stroke="#555"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M90 162 Q100 172 110 162 Q100 158 90 162 Z"
                  fill="#ff8aa0"
                />
              </g>
            ) : mood === "chew" ? (
              <path
                className="buddy-chew-mouth"
                d="M84 150 Q100 184 116 150 Z"
                fill="#7a2a3a"
                stroke="#555"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            ) : (
              <path
                d="M84 152 Q100 168 116 152"
                fill="none"
                stroke="#555"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}

            {/* arms + heart */}
            <path
              className="buddy-arm-l"
              d="M32 196 C50 200 66 214 84 232"
              fill="none"
              stroke={palette.edge}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              className="buddy-arm-r"
              d="M168 196 C150 200 134 214 116 232"
              fill="none"
              stroke={palette.edge}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <Heart className="buddy-heart" x={100} y={226} size={3.2} />

            <Accessory kind={accessory} />

            {mood === "sleepy" &&
              [
                [150, 30, 0],
                [168, 10, 0.6],
              ].map(([x, y, d], i) => (
                <text
                  key={i}
                  className="buddy-zzz"
                  style={{ animationDelay: `${d}s` }}
                  x={x}
                  y={y}
                  fontSize="22"
                  fontWeight="700"
                  fill="#7c8db5"
                >
                  z
                </text>
              ))}

            {showHearts &&
              [
                [60, 20, 0],
                [100, 0, 0.4],
                [140, 20, 0.8],
              ].map(([x, y, d], i) => (
                <Heart
                  key={i}
                  className="buddy-float"
                  style={{ animationDelay: `${d}s` }}
                  x={x}
                  y={y}
                  size={1.2}
                  fill="#ff8aa0"
                />
              ))}
          </g>
        </g>
      </svg>
    </button>
  );
}
