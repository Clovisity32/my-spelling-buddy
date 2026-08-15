// Pure stroke-painting functions shared by the interactive Whiteboard and
// the read-only StrokeReplay, so a saved attempt renders identically in
// both. A stroke is a flat int-pair array in a fixed logical coordinate
// space — ported approach from My Lesson Buddy's WhiteboardCanvas.jsx, see
// docs/superpowers/specs/2026-08-15-spelling-buddy-design.md. Zoom/pan and
// board-image compositing are deliberately not ported (unneeded here),
// which is why this file needs no offscreen scratch canvas: a plain
// destination-out stroke painted directly, after the white fill, is enough.
export const CANVAS_W = 1000;
export const CANVAS_H = 500;
export const PEN_SIZES = { fine: 3, medium: 6, thick: 10 };
export const ERASER_SIZES = { small: 20, medium: 32, large: 48 };
export const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#059669", "#7c3aed"];
export const DECIMATE_MIN_DIST = 3;

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function paintStroke(ctx, stroke, scale) {
  const pts = stroke.points;
  if (pts.length < 2) return;
  const erasing = stroke.tool === "eraser";
  ctx.save();
  if (erasing) {
    // Restores the white fill by painting white over strokes.
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
  } else {
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
  }
  ctx.lineWidth = stroke.width * scale;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (pts.length === 2) {
    // A tap with no drag — draw a dot so it's still visible.
    ctx.beginPath();
    ctx.arc(
      pts[0] * scale,
      pts[1] * scale,
      (stroke.width * scale) / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0] * scale, pts[1] * scale);
  for (let i = 2; i < pts.length; i += 2)
    ctx.lineTo(pts[i] * scale, pts[i + 1] * scale);
  ctx.stroke();
  ctx.restore();
}

export function redrawAll(ctx, canvas, strokes, scale) {
  // Clear in untransformed device pixels regardless of whatever transform
  // (dpr scaling) the caller has set, then restore it for the fill/strokes
  // below, which are painted in the caller's coordinate convention
  // (logical-unit coordinates times `scale`).
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W * scale, CANVAS_H * scale);
  for (const stroke of strokes) paintStroke(ctx, stroke, scale);
}
