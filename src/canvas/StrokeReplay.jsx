import { useEffect, useRef } from "react";
import { redrawAll, getStrokesBounds } from "./strokes.js";

// This is a review thumbnail, not the whiteboard itself — cap the
// rendered height regardless of the ink's aspect ratio, so a tall/square
// scribble doesn't stretch to fill the full card width and end up taller
// than the uncropped board used to be. MIN_CROP_SIZE floors the bounding
// box so a single dot or very short stroke doesn't get zoomed in absurdly
// far by the "fit to max height" scale calculation.
const MAX_HEIGHT = 220;
const MIN_CROP_SIZE = 120;

function clampBoundsMin(bounds) {
  let { x, y, width, height } = bounds;
  if (height < MIN_CROP_SIZE) {
    const cy = y + height / 2;
    height = MIN_CROP_SIZE;
    y = cy - height / 2;
  }
  if (width < MIN_CROP_SIZE) {
    const cx = x + width / 2;
    width = MIN_CROP_SIZE;
    x = cx - width / 2;
  }
  return { x, y, width, height };
}

export default function StrokeReplay({ strokes }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const rawBounds = getStrokesBounds(strokes) || {
      x: 0,
      y: 0,
      width: MIN_CROP_SIZE,
      height: MIN_CROP_SIZE,
    };
    const bounds = clampBoundsMin(rawBounds);

    const availW = container.clientWidth;
    const scale = Math.min(availW / bounds.width, MAX_HEIGHT / bounds.height);
    const cssW = bounds.width * scale;
    const cssH = bounds.height * scale;
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawAll(
      ctx,
      canvas,
      strokes || [],
      scale,
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height,
    );
  }, [strokes]);

  return (
    <div
      ref={containerRef}
      className="flex w-full items-center justify-center rounded-2xl bg-white shadow-inner"
      data-testid="stroke-replay"
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
