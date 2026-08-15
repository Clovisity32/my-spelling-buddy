import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  CANVAS_W,
  CANVAS_H,
  PEN_SIZES,
  ERASER_SIZES,
  COLORS,
  DECIMATE_MIN_DIST,
  uid,
  redrawAll,
} from "./strokes.js";

// A pointer is pruned from the tracked set after this many ms — iPadOS
// silently swallows some pointerup events, and a leaked entry would
// otherwise sit in the map forever. Ported from My Lesson Buddy's
// WhiteboardCanvas.jsx (see docs/superpowers/specs/2026-08-15-spelling-buddy-design.md).
const POINTER_STALE_MS = 800;

const Whiteboard = forwardRef(function Whiteboard(
  { initialStrokes = [], fingerDraw, onFingerDrawChange },
  ref,
) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const strokesRef = useRef(
    initialStrokes.map((s) => ({ ...s, points: [...s.points] })),
  );
  const scaleRef = useRef(1);
  const drawingRef = useRef(false);
  const drawingPointerIdRef = useRef(null);
  const lastPointRef = useRef(null);
  const pendingResizeRef = useRef(false);
  const activePointersRef = useRef(new Map());
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [penSize, setPenSize] = useState("medium");
  const [eraserSize, setEraserSize] = useState("medium");
  const [strokeCount, setStrokeCount] = useState(strokesRef.current.length);

  function fullRepaint() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    redrawAll(
      canvas.getContext("2d"),
      canvas,
      strokesRef.current,
      scaleRef.current,
    );
  }

  const fitCanvas = useCallback(() => {
    if (drawingRef.current) {
      pendingResizeRef.current = true;
      return;
    }
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const availW = container.clientWidth;
    const availH = container.clientHeight;
    if (!availW || !availH) return;
    const targetRatio = CANVAS_W / CANVAS_H;
    let cssW = availW;
    let cssH = cssW / targetRatio;
    if (cssH > availH) {
      cssH = availH;
      cssW = cssH * targetRatio;
    }
    // Backing store at devicePixelRatio so pen strokes stay crisp; resize is
    // deferred above while a stroke is in progress because reassigning
    // canvas.width/height flash-clears the surface mid-stroke.
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scaleRef.current = cssW / CANVAS_W;
    fullRepaint();
  }, []);

  useEffect(() => {
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, [fitCanvas]);

  // iPadOS recognizes system-wide multi-finger gestures (long-press ->
  // text-selection loupe, 3-finger tap/swipe -> Copy/Undo) above pointer
  // dispatch. `touch-action: none` stops the browser's own pan/zoom but not
  // these OS gestures — only preventDefault on the raw touch/gesture events
  // stops them, and it must be a non-passive listener since React's JSX
  // onTouch* props attach passively.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const stop = (e) => e.preventDefault();
    canvas.addEventListener("touchstart", stop, { passive: false });
    canvas.addEventListener("touchmove", stop, { passive: false });
    canvas.addEventListener("gesturestart", stop, { passive: false });
    canvas.addEventListener("gesturechange", stop, { passive: false });
    return () => {
      canvas.removeEventListener("touchstart", stop);
      canvas.removeEventListener("touchmove", stop);
      canvas.removeEventListener("gesturestart", stop);
      canvas.removeEventListener("gesturechange", stop);
    };
  }, []);

  function toLogical(clientX, clientY) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scale = scaleRef.current;
    return [(clientX - rect.left) / scale, (clientY - rect.top) / scale];
  }

  function prunePointers(now) {
    for (const [id, p] of activePointersRef.current) {
      if (now - p.t > POINTER_STALE_MS) activePointersRef.current.delete(id);
    }
  }

  function onPointerDown(e) {
    // Prune stale entries FIRST, before the palm-rejection check below reads
    // the tracked-pointers map — otherwise a pen whose pointerup iPadOS
    // swallowed leaves a stale "pen" entry that the rejection check's early
    // return (below) stops us from ever reaching prunePointers() to clean
    // up, since every subsequent touch pointerdown hits that same early
    // return before this line. Left in the original order, that's a
    // PERMANENT touch-draw lockout after any pencil session where a
    // pointerup gets swallowed — exactly the scenario the "No pencil
    // today?" finger-draw toggle exists to support.
    const now = Date.now();
    prunePointers(now);

    // Palm rejection: a touch pointer landing while a pen pointer is
    // tracked is presumed to be a resting palm, not a second intentional
    // finger, and is dropped without being tracked.
    if (e.pointerType === "touch") {
      for (const p of activePointersRef.current.values()) {
        if (p.type === "pen") return;
      }
    }
    activePointersRef.current.set(e.pointerId, { t: now, type: e.pointerType });

    const isDrawable = e.pointerType !== "touch" || fingerDraw;
    if (!isDrawable) return;

    const canvas = canvasRef.current;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a smoothness nicety, not required for drawing to work.
    }
    const [x, y] = toLogical(e.clientX, e.clientY);
    const strokeColor = tool === "eraser" ? "#ffffff" : color;
    const strokeWidth =
      tool === "eraser" ? ERASER_SIZES[eraserSize] : PEN_SIZES[penSize];
    const stroke = {
      id: uid(),
      tool,
      color: strokeColor,
      width: strokeWidth,
      points: [x, y],
    };
    strokesRef.current.push(stroke);
    setStrokeCount(strokesRef.current.length);
    drawingRef.current = true;
    drawingPointerIdRef.current = e.pointerId;
    lastPointRef.current = [x, y];
    fullRepaint();
  }

  function onPointerMove(e) {
    if (!drawingRef.current) return;
    if (e.pointerId !== drawingPointerIdRef.current) return;
    const [x, y] = toLogical(e.clientX, e.clientY);
    const [lx, ly] = lastPointRef.current;
    if (Math.hypot(x - lx, y - ly) < DECIMATE_MIN_DIST) return;
    lastPointRef.current = [x, y];
    const stroke = strokesRef.current[strokesRef.current.length - 1];
    stroke.points.push(x, y);

    // Fast path: append just the new segment onto the already-painted
    // canvas instead of replaying every stroke on every pointer move.
    // Eraser paints opaque white rather than using destination-out: this
    // board is a single flat canvas with no separate ink layer over a
    // background image (that's what destination-out is for), so punching
    // an alpha hole would cut through the white fill itself and leave a
    // transparent pixel, not a white one — inconsistent with strokes.js's
    // redrawAll, which paints eraser strokes as opaque white for the same
    // reason.
    const ctx = canvasRef.current.getContext("2d");
    ctx.save();
    ctx.strokeStyle = stroke.tool === "eraser" ? "#ffffff" : stroke.color;
    ctx.lineWidth = stroke.width * scaleRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(lx * scaleRef.current, ly * scaleRef.current);
    ctx.lineTo(x * scaleRef.current, y * scaleRef.current);
    ctx.stroke();
    ctx.restore();
  }

  function onPointerUp(e) {
    activePointersRef.current.delete(e.pointerId);
    if (!drawingRef.current) return;
    if (e.pointerId !== drawingPointerIdRef.current) return;
    drawingRef.current = false;
    drawingPointerIdRef.current = null;
    lastPointRef.current = null;
    if (pendingResizeRef.current) {
      pendingResizeRef.current = false;
      fitCanvas();
    }
  }

  function undo() {
    if (strokesRef.current.length === 0) return;
    strokesRef.current.pop();
    setStrokeCount(strokesRef.current.length);
    fullRepaint();
  }

  function clearBoard() {
    strokesRef.current = [];
    setStrokeCount(0);
    fullRepaint();
  }

  useImperativeHandle(ref, () => ({
    getStrokes: () =>
      strokesRef.current.map((s) => ({ ...s, points: [...s.points] })),
    clearBoard,
  }));

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <div
        ref={containerRef}
        className="flex min-h-0 flex-1 items-center justify-center rounded-2xl bg-white shadow-inner"
        data-stroke-count={strokeCount}
      >
        <canvas
          ref={canvasRef}
          style={{ touchAction: "none", display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white/80 p-3">
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Pen colour ${c}`}
            onClick={() => {
              setTool("pen");
              setColor(c);
            }}
            className={`h-10 w-10 rounded-full border-4 ${tool === "pen" && color === c ? "border-slate-700" : "border-transparent"}`}
            style={{ backgroundColor: c }}
          />
        ))}
        {["fine", "medium", "thick"].map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => {
              setTool("pen");
              setPenSize(size);
            }}
            className={`rounded-full px-3 py-2 text-sm font-semibold capitalize ${tool === "pen" && penSize === size ? "bg-slate-700 text-white" : "bg-slate-200"}`}
          >
            {size}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTool("eraser")}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${tool === "eraser" ? "bg-slate-700 text-white" : "bg-slate-200"}`}
        >
          Eraser
        </button>
        <button
          type="button"
          onClick={undo}
          className="rounded-full bg-amber-200 px-4 py-2 text-sm font-semibold"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={clearBoard}
          className="rounded-full bg-rose-200 px-4 py-2 text-sm font-semibold"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => onFingerDrawChange(!fingerDraw)}
          className={`rounded-full px-4 py-2 text-sm font-semibold ${fingerDraw ? "bg-emerald-300" : "bg-slate-200"}`}
        >
          {fingerDraw ? "Finger draw: on" : "No pencil today?"}
        </button>
      </div>
    </div>
  );
});

export default Whiteboard;
