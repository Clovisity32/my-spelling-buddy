import { useEffect, useState } from "react";

// What each small friend is wearing, { colour: accessory }, for the screens
// that show them.
export default function useFriendStyles() {
  const [styles, setStyles] = useState({});
  useEffect(() => {
    let live = true;
    (async () => {
      const s = await window.__storage.getFriendStyles();
      if (live) setStyles(s);
    })();
    return () => {
      live = false;
    };
  }, []);
  return styles;
}
