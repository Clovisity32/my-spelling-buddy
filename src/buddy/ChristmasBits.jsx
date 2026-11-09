import "./christmas.css";
import { SNOW_COUNT, SNOW_COUNT_HEAVY } from "./christmas.js";

const BULB_COLORS = ["#ff4d6d", "#ffd54a", "#4dabff", "#ff9ad5", "#6dff8c"];
// [x, y] inside the three tiers of the tree.
const BULBS = [
  [52, 40],
  [68, 48],
  [48, 60],
  [72, 62],
  [54, 62],
  [68, 72],
  [46, 84],
  [74, 88],
  [56, 96],
  [52, 90],
  [70, 98],
  [36, 112],
  [60, 108],
  [84, 118],
  [22, 126],
  [96, 128],
  [48, 124],
  [72, 126],
];

// The Christmas tree on the lawn: three tiers, shiny twinkling light blobs, a
// gold garland, a glowing star on top, and presents underneath.
export function ChristmasTree() {
  return (
    <div className="xmas-tree" data-testid="christmas-tree" aria-hidden="true">
      <svg viewBox="0 0 120 164" className="block w-full overflow-visible">
        <defs>
          <linearGradient id="xmas-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3fae5c" />
            <stop offset="100%" stopColor="#1d7a3f" />
          </linearGradient>
          <radialGradient id="xmas-star" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#fffbe0" />
            <stop offset="55%" stopColor="#ffd54a" />
            <stop offset="100%" stopColor="#f5a300" />
          </radialGradient>
        </defs>
        <rect
          x="52"
          y="130"
          width="16"
          height="16"
          rx="2"
          fill="#8a5a33"
          stroke="#5e3b1f"
          strokeWidth="2.5"
        />
        <g
          fill="url(#xmas-green)"
          stroke="#14602f"
          strokeWidth="3"
          strokeLinejoin="round"
        >
          <path d="M60 70 L12 132 Q60 142 108 132 Z" />
          <path d="M60 44 L22 100 Q60 110 98 100 Z" />
          <path d="M60 20 L30 70 Q60 78 90 70 Z" />
        </g>
        <g
          fill="none"
          stroke="#ffe9a8"
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="0.95"
        >
          <path d="M42 52 Q60 62 78 52" />
          <path d="M30 80 Q60 94 90 80" />
          <path d="M18 112 Q60 128 102 112" />
        </g>
        {BULBS.map(([x, y], i) => {
          const c = BULB_COLORS[i % BULB_COLORS.length];
          return (
            <g
              key={i}
              className="xmas-bulb"
              style={{ "--c": c, animationDelay: `${(i % 6) * 0.25}s` }}
            >
              <circle
                cx={x}
                cy={y}
                r="4.2"
                fill={c}
                stroke="#fff"
                strokeOpacity="0.5"
                strokeWidth="0.8"
              />
              <circle
                cx={x - 1.3}
                cy={y - 1.3}
                r="1.2"
                fill="#fff"
                opacity="0.9"
              />
            </g>
          );
        })}
        {/* presents under the tree */}
        <g strokeWidth="2" strokeLinejoin="round">
          <rect
            x="6"
            y="144"
            width="26"
            height="18"
            rx="2"
            fill="#e5484d"
            stroke="#b4252b"
          />
          <path d="M19 144 V162 M6 153 H32" stroke="#ffe9a8" strokeWidth="3" />
          <rect
            x="88"
            y="148"
            width="24"
            height="14"
            rx="2"
            fill="#4dabff"
            stroke="#2a78c4"
          />
          <path d="M100 148 V162 M88 155 H112" stroke="#fff" strokeWidth="3" />
          <rect
            x="72"
            y="153"
            width="14"
            height="9"
            rx="2"
            fill="#6dd58c"
            stroke="#2f9e5b"
          />
        </g>
        {/* the shiny star */}
        <g className="xmas-starwrap" transform="translate(60 14)">
          <g
            className="xmas-rays"
            stroke="#fff6c0"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M0 -18 V-11 M0 11 V18 M-18 0 H-11 M11 0 H18" />
            <path
              d="M-12 -12 L-8 -8 M12 -12 L8 -8 M-12 12 L-8 8 M12 12 L8 8"
              opacity="0.7"
            />
          </g>
          <path
            className="xmas-star"
            d="M0 -11 L3.2 -3.6 L11 -3.4 L4.8 1.6 L7 9.4 L0 5 L-7 9.4 L-4.8 1.6 L-11 -3.4 L-3.2 -3.6 Z"
            fill="url(#xmas-star)"
            stroke="#d98a00"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <circle cx="-3" cy="-3" r="1.6" fill="#fff" />
        </g>
      </svg>
    </div>
  );
}

// Falling snow over the whole scene. Heavier while everyone sings. Flake
// positions are fixed (not random) so the same flakes don't jump on re-render.
export function Snow({ heavy = false }) {
  const n = heavy ? SNOW_COUNT_HEAVY : SNOW_COUNT;
  return (
    <div className="xmas-snow" data-testid="snow" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => (
        <span
          key={i}
          className="xmas-flake"
          style={{
            left: `${(i * 37 + (i % 7) * 5) % 100}%`,
            "--y": (i * 53) % 90,
            "--s": `${3 + (i % 4) * 1.6}px`,
            "--d": `${7 + (i % 6) * 1.7}s`,
            "--x": `${(i % 2 ? 1 : -1) * (14 + (i % 5) * 8)}px`,
            animationDelay: `${-((i * 0.9) % 11)}s`,
          }}
        />
      ))}
    </div>
  );
}

// Lights strung along a roof (apex, left eave, right eave).
export function RoofLights({ apex, left, right }) {
  const along = (a, b, t) => [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
  ];
  const pts = [0.12, 0.3, 0.48, 0.66, 0.84].flatMap((t) => [
    along(apex, left, t),
    along(apex, right, t),
  ]);
  return (
    <g data-festive="roof-lights">
      {pts.map(([x, y], i) => (
        <circle
          key={i}
          className="xmas-bulb"
          cx={x}
          cy={y + 3}
          r="3.6"
          fill={BULB_COLORS[i % BULB_COLORS.length]}
          style={{
            "--c": BULB_COLORS[i % BULB_COLORS.length],
            animationDelay: `${(i % 5) * 0.3}s`,
          }}
        />
      ))}
    </g>
  );
}

// A snow cap for a roof, following the eaves (apex, left/right points where
// the cap ends).
export function SnowCap({ apex, left, right }) {
  const [ax, ay] = apex;
  const [lx, ly] = left;
  const [rx, ry] = right;
  const mx = ax;
  return (
    <path
      data-festive="snow-cap"
      d={`M${lx} ${ly} L${ax} ${ay} L${rx} ${ry} Q${rx - 11} ${ry + 8} ${rx - 22} ${ry + 1} Q${mx + 13} ${ly + 10} ${mx} ${ly + 2} Q${mx - 13} ${ly + 10} ${lx + 22} ${ly + 1} Q${lx + 11} ${ly + 8} ${lx} ${ly} Z`}
      fill="#fff"
      stroke="#cfe0ee"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
  );
}

// A wrapped present popping open over a Buddy: the box shakes, then the
// surprise floats up.
export function GiftBurst({ prize, hue = 0 }) {
  return (
    <span className="xmas-burst" data-testid="gift-burst" aria-hidden="true">
      <span
        className="xmas-burst-box"
        style={{ filter: `hue-rotate(${hue}deg)` }}
      >
        🎁
      </span>
      <span className="xmas-burst-prize">{prize}</span>
      <span className="xmas-burst-spark">✨</span>
    </span>
  );
}

// Music notes (and snowflakes) drifting up from a singing Buddy.
export function CarolNotes() {
  return (
    <>
      <span className="scene-note xmas-note xmas-note--a" aria-hidden="true">
        ♪
      </span>
      <span className="scene-note xmas-note xmas-note--b" aria-hidden="true">
        ♫
      </span>
      <span className="scene-note xmas-note xmas-note--c" aria-hidden="true">
        ❄
      </span>
    </>
  );
}
