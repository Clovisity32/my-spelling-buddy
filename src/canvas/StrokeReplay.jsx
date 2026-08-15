import { useEffect, useRef } from "react";
import { CANVAS_W, CANVAS_H, redrawAll } from "./strokes.js";

export default function StrokeReplay({ strokes }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const cssW = container.clientWidth;
    const cssH = cssW / (CANVAS_W / CANVAS_H);
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redrawAll(ctx, canvas, strokes || [], cssW / CANVAS_W);
  }, [strokes]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-2xl bg-white shadow-inner"
      data-testid="stroke-replay"
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}
