import { useRef, useState } from "react";
import Whiteboard from "./canvas/Whiteboard.jsx";
import StrokeReplay from "./canvas/StrokeReplay.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const wbRef = useRef(null);
  const [fingerDraw, setFingerDraw] = useState(false);

  function navigate(next, nextParams = {}) {
    setScreen(next);
    setParams(nextParams);
  }

  const harness = new URLSearchParams(window.location.search).get("harness");
  if (harness === "whiteboard") {
    window.__wb = wbRef;
    return (
      <div style={{ height: "100vh" }}>
        <Whiteboard
          ref={wbRef}
          fingerDraw={fingerDraw}
          onFingerDrawChange={setFingerDraw}
        />
      </div>
    );
  }
  if (harness === "replay") {
    return (
      <div style={{ height: "100vh" }}>
        <StrokeReplay strokes={window.__REPLAY_STROKES__ || []} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sky-50 text-slate-800">
      {screen === "home" && (
        <div className="flex min-h-screen items-center justify-center">
          <h1 className="text-4xl font-bold">My Spelling Buddy</h1>
        </div>
      )}
    </div>
  );
}
