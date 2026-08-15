import { useState } from "react";

export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});

  function navigate(next, nextParams = {}) {
    setScreen(next);
    setParams(nextParams);
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
