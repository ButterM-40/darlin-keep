"use client";

import { useEffect, useRef, useState } from "react";

// The forge's own variable names, each filled from a site token so it wears
// the active theme.
const FORGE_VARS: Record<string, string> = {
  "--panel": "color-mix(in srgb, var(--color-ink-800) 80%, transparent)",
  "--line": "var(--color-ink-500)",
  "--gold": "var(--color-gold)",
  "--ember": "var(--color-ember)",
  "--text": "var(--color-parchment)",
  "--muted": "var(--color-parchment-dim)",
  "--field": "var(--color-ink-900)",
  "--btn": "var(--color-ink-600)",
  "--display": "var(--font-display)",
};

/** Resolves the site's theme here, then writes plain values into the frame. */
function copyTheme(target: Document) {
  const probe = document.createElement("span");
  probe.style.display = "none";
  document.body.appendChild(probe);
  const root = target.documentElement;
  for (const [name, value] of Object.entries(FORGE_VARS)) {
    probe.style.setProperty("--probe", value);
    // Custom properties resolve var() references when read back as computed.
    const resolved = getComputedStyle(probe).getPropertyValue("--probe").trim();
    if (resolved) root.style.setProperty(name, resolved);
  }
  probe.remove();
  root.style.colorScheme = getComputedStyle(document.documentElement).colorScheme;

  // The heading font is loaded by the site's <head>; the frame needs its own copy.
  target.querySelectorAll("link[data-dk-font]").forEach((l) => l.remove());
  document.querySelectorAll<HTMLLinkElement>('link[href^="https://fonts.googleapis.com"]').forEach((link) => {
    const copy = target.createElement("link");
    copy.rel = "stylesheet";
    copy.href = link.href;
    copy.dataset.dkFont = "";
    target.head.appendChild(copy);
  });
}

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
      copyTheme(win.document);
    }

    // A theme change swaps the <style> the layout writes; follow it.
    const themeWatch = new MutationObserver(() => {
      const win = frame.contentWindow;
      if (win?.document.documentElement) copyTheme(win.document);
    });
    themeWatch.observe(document.head, { childList: true, subtree: true, characterData: true });

    // The document may already have loaded before hydration.
    if (frame.contentDocument?.readyState === "complete") attach();
    frame.addEventListener("load", attach);
    return () => {
      frame.removeEventListener("load", attach);
      observer?.disconnect();
      themeWatch.disconnect();
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
