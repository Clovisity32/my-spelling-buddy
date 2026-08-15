import { useRef, useState } from "react";
import Whiteboard from "./canvas/Whiteboard.jsx";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const wbRef = useRef(null);
  const [fingerDraw, setFingerDraw] = useState(false);

  function navigate(next, nextParams = {}) {
    setScreen(next);
    setParams(nextParams);
  }

  // Test-only harness routes, selected via ?harness=<name>. Lets Playwright
  // mount a single component full-screen instead of driving the whole app
  // to reach it — same rationale as the window.__storage/__audio hooks.
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
