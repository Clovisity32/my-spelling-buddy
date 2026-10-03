import Buddy from "./Buddy.jsx";

// Overlapping like her drawing: tall ones at the back, small ones in front.
// Each member has its own colour, voice pitch and xylophone note.
const MEMBERS = [
  { color: "lavender", size: 96, left: "0%", bottom: "6%", z: 1, delay: 0.0 },
  { color: "sky", size: 104, left: "74%", bottom: "6%", z: 1, delay: 0.3 },
  { color: "mint", size: 112, left: "16%", bottom: "0%", z: 2, delay: 0.15 },
  { color: "butter", size: 112, left: "58%", bottom: "0%", z: 2, delay: 0.45 },
  { color: "peach", size: 140, left: "36%", bottom: "-4%", z: 3, delay: 0.1 },
  { color: "rose", size: 80, left: "6%", bottom: "-6%", z: 4, delay: 0.6 },
  { color: "coral", size: 80, left: "82%", bottom: "-6%", z: 4, delay: 0.25 },
];

export default function BuddyFamily({ mood = "dance", className = "" }) {
  return (
    <div
      className={`relative mx-auto h-56 w-full max-w-md sm:h-64 ${className}`}
      aria-label="Buddy and friends"
    >
      {MEMBERS.map((m, i) => (
        <div
          key={m.color}
          className="absolute"
          style={{
            left: m.left,
            bottom: m.bottom,
            zIndex: m.z,
            width: `${m.size * 0.62}px`,
            animationDelay: `${m.delay}s`,
          }}
        >
          <div style={{ animationDelay: `${m.delay}s` }}>
            <Buddy
              mood={mood}
              color={m.color}
              size={m.size * 0.62}
              pitch={0.8 + i * 0.09}
              label={`${m.color} buddy`}
              onTap={() => window.__audio?.playBuddyNote?.(i)}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
