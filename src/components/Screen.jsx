// The page shell every screen renders inside. Owns the three things that
// were previously re-implemented (and drifted) in all seven screens:
//
//  1. Viewport height — h-dvh, not h-screen. 100vh on iPadOS does not match
//     the usable area once browser chrome and the home indicator are taken
//     into account, so h-screen left content clipped at the bottom.
//  2. Safe-area insets — index.html sets viewport-fit=cover, which draws
//     content under the status bar and rounded corners. Nothing compensated
//     for that, which is why titles sat on the bezel and the top line of the
//     practice screen was cut off. max(gutter, inset) keeps a sane gutter on
//     devices with no inset at all.
//  3. A centred, width-capped content column, so text and controls stop
//     spanning a full iPad width edge to edge.
//
// Insets live here rather than on <body> so that Review's inner scroll
// container can still reach the true bottom of the display.
export default function Screen({
  children,
  // Hero screens (Home, Celebration) centre a short stack instead of
  // running a header + content column.
  centered = false,
  // The whiteboard wants the full width; text screens do not.
  max = "max-w-5xl",
  // The practice screen, where every vertical pixel goes to the canvas.
  tight = false,
  className = "",
}) {
  const gutter = tight ? "0.75rem" : "1.25rem";
  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden ${className}`}
      style={{
        paddingTop: `max(${gutter}, env(safe-area-inset-top))`,
        paddingBottom: `max(${gutter}, env(safe-area-inset-bottom))`,
        paddingLeft: `max(${gutter}, env(safe-area-inset-left))`,
        paddingRight: `max(${gutter}, env(safe-area-inset-right))`,
      }}
    >
      <div
        className={`mx-auto flex w-full flex-1 flex-col overflow-hidden ${max} ${
          centered ? "items-center justify-center gap-8 text-center" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}
