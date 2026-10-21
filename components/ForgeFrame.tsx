"use client";

import { useEffect, useRef, useState } from "react";

// The forge is a standalone page in public/ with its own script and browser
// storage. It is same-origin, so the frame can follow its content height and
// the page scrolls as one instead of nesting a second scrollbar.
export function ForgeFrame() {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(900);

  useEffect(() => {
    const frame = ref.current;
    if (!frame) return;
    let observer: ResizeObserver | undefined;

    function attach() {
      const win = frame?.contentWindow as (Window & typeof globalThis) | null;
      const root = win?.document.documentElement;
      if (!win || !root) return;
      observer?.disconnect();
      // Built from the frame's own realm so it observes the frame's document.
      observer = new win.ResizeObserver(() => setHeight(root.scrollHeight));
      observer.observe(root);
    }

    // The document may already have loaded before hydration.
    if (frame.contentDocument?.readyState === "complete") attach();
    frame.addEventListener("load", attach);
    return () => {
      frame.removeEventListener("load", attach);
      observer?.disconnect();
    };
  }, []);

  return (
    <iframe
      ref={ref}
      src="/forge.html"
      title="Old School Forge"
      className="block w-full border-0"
      style={{ height }}
    />
  );
}
