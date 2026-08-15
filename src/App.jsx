import { useRef, useState } from "react";
import Whiteboard from "./canvas/Whiteboard.jsx";
import StrokeReplay from "./canvas/StrokeReplay.jsx";
import Home from "./screens/Home.jsx";
import ParentMenu from "./screens/ParentMenu.jsx";
import Lists from "./screens/Lists.jsx";
import ListEditor from "./screens/ListEditor.jsx";
import Test from "./screens/Test.jsx";
import Celebration from "./screens/Celebration.jsx";
import Review from "./screens/Review.jsx";

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
      {screen === "home" && <Home onNavigate={navigate} />}
      {screen === "parentMenu" && <ParentMenu onNavigate={navigate} />}
      {screen === "lists" && <Lists mode={params.mode} onNavigate={navigate} />}
      {screen === "editor" && (
        <ListEditor listId={params.listId} onNavigate={navigate} />
      )}
      {screen === "test" && (
        <Test
          listId={params.listId}
          shuffle={params.shuffle}
          wordId={params.wordId}
          returnTo={params.returnTo}
          onNavigate={navigate}
        />
      )}
      {screen === "celebration" && (
        <Celebration listId={params.listId} onNavigate={navigate} />
      )}
      {screen === "review" && (
        <Review
          listId={params.listId}
          focusWordId={params.focusWordId}
          onNavigate={navigate}
        />
      )}
    </div>
  );
}
