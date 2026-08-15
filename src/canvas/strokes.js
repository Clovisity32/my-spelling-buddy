// Pure stroke-painting functions shared by the interactive Whiteboard and
// the read-only StrokeReplay, so a saved attempt renders identically in
// both. A stroke is a flat int-pair array in a fixed logical coordinate
// space — ported approach from My Lesson Buddy's WhiteboardCanvas.jsx, see
// docs/superpowers/specs/2026-08-15-spelling-buddy-design.md. Zoom/pan and
// board-image compositing are deliberately not ported (unneeded here),
// which is why this file needs no offscreen scratch canvas: painting the
// eraser stroke as opaque white, directly over the white fill, is enough.
export const CANVAS_W = 1000;
export const CANVAS_H = 500;
export const PEN_SIZES = { fine: 3, medium: 6, thick: 10 };
export const ERASER_SIZES = { small: 20, medium: 32, large: 48 };
export const COLORS = ["#1f2937", "#dc2626", "#2563eb", "#059669", "#7c3aed"];
export const DECIMATE_MIN_DIST = 3;

export function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function paintStroke(ctx, stroke, scale, offsetX = 0, offsetY = 0) {
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
      (pts[0] - offsetX) * scale,
      (pts[1] - offsetY) * scale,
      (stroke.width * scale) / 2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo((pts[0] - offsetX) * scale, (pts[1] - offsetY) * scale);
  for (let i = 2; i < pts.length; i += 2)
    ctx.lineTo((pts[i] - offsetX) * scale, (pts[i + 1] - offsetY) * scale);
  ctx.stroke();
  ctx.restore();
}

export function redrawAll(
  ctx,
  canvas,
  strokes,
  scale,
  offsetX = 0,
  offsetY = 0,
  fillW = CANVAS_W,
  fillH = CANVAS_H,
) {
  // Clear in untransformed device pixels regardless of whatever transform
  // (dpr scaling) the caller has set, then restore it for the fill/strokes
  // below, which are painted in the caller's coordinate convention
  // (logical-unit coordinates times `scale`, shifted by offsetX/Y). The
  // interactive Whiteboard always paints the full 1000x500 canvas
  // (offsetX/Y=0, fillW/H=CANVAS_W/H, all defaults); StrokeReplay passes a
  // cropped region so a small doodle isn't rendered inside a mostly-empty
  // full-size board.
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, fillW * scale, fillH * scale);
  for (const stroke of strokes)
    paintStroke(ctx, stroke, scale, offsetX, offsetY);
}

// The tight bounding box of the ink itself (plus padding), in logical
// 1000x500 units — lets a read-only replay crop to what was actually
// drawn instead of always showing the whole board, which for a single
// short word is mostly empty white space.
export function getStrokesBounds(strokes, padding = 40) {
  if (!strokes || strokes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const stroke of strokes) {
    const half = stroke.width / 2;
    const pts = stroke.points;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i] - half);
      maxX = Math.max(maxX, pts[i] + half);
      minY = Math.min(minY, pts[i + 1] - half);
      maxY = Math.max(maxY, pts[i + 1] + half);
    }
  }
  if (!Number.isFinite(minX)) return null;
  minX = Math.max(0, minX - padding);
  minY = Math.max(0, minY - padding);
  maxX = Math.min(CANVAS_W, maxX + padding);
  maxY = Math.min(CANVAS_H, maxY + padding);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
