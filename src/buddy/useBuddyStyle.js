import { useEffect, useState } from "react";

// Buddy's chosen colour + accessory, shared by every screen that shows it.
export default function useBuddyStyle() {
  const [style, setStyle] = useState({ color: "peach", accessory: "none" });
  useEffect(() => {
    let live = true;
    (async () => {
      const s = await window.__storage.getBuddyStyle();
      if (live) setStyle(s);
    })();
    return () => {
      live = false;
    };
  }, []);
  return style;
}
