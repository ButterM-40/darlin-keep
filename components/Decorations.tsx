/**
 * The decorations a theme can switch on. All of them are always in the page
 * and hidden by CSS; the theme only flips custom properties (see themeVars in
 * lib/themes.ts), so the editor can preview them without a render.
 */

// A corner web: six spokes and five sagging rings, drawn once.
const WEB_PATH = (() => {
  const angles = [0, 18, 36, 54, 72, 90];
  const rings = [20, 40, 60, 80, 102];
  const pt = (r: number, a: number) => {
    const t = (a * Math.PI) / 180;
    return `${(r * Math.cos(t)).toFixed(1)} ${(r * Math.sin(t)).toFixed(1)}`;
  };
  let d = angles.map((a) => `M0 0L${pt(118, a)}`).join("");
  for (const r of rings) {
    for (let i = 0; i < angles.length - 1; i++) {
      d += `M${pt(r, angles[i])}Q${pt(r * 0.82, (angles[i] + angles[i + 1]) / 2)} ${pt(r, angles[i + 1])}`;
    }
  }
  return d;
})();

export function Web() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <path d={WEB_PATH} fill="none" stroke="currentColor" strokeWidth=".9" strokeLinecap="round" />
    </svg>
  );
}

function Spider() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden>
      <path
        d="M10 9L3 4M10 10L2 9M10 11L3 15M10 12L5 18M10 9L17 4M10 10L18 9M10 11L17 15M10 12L15 18"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <ellipse cx="10" cy="11.5" rx="3.4" ry="4" fill="currentColor" />
      <circle cx="10" cy="6.6" r="2.3" fill="currentColor" />
    </svg>
  );
}

function Bat() {
  return (
    <svg viewBox="0 0 40 20" aria-hidden>
      <path
        d="M20 7C19 5 18 4.5 17 6C13.5 2 7 1 0 4C4 6 6 9 6 12.5C9 10.5 12 11 13.5 14C15.5 12 17.5 12.5 20 15C22.5 12.5 24.5 12 26.5 14C28 11 31 10.5 34 12.5C34 9 36 6 40 4C33 1 26.5 2 23 6C22 4.5 21 5 20 7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Pumpkin() {
  return (
    <svg viewBox="0 0 64 56" aria-hidden>
      <path d="M30 11C30 5 33 2.5 37.5 1.5L38.5 4.5C35.5 5.5 34.5 7.5 34.5 11.5Z" fill="#5b7a2e" />
      <ellipse cx="20" cy="34" rx="16" ry="19" fill="#c9561a" />
      <ellipse cx="44" cy="34" rx="16" ry="19" fill="#c9561a" />
      <ellipse cx="32" cy="33" rx="15" ry="21.5" fill="#ec7a22" />
      <path d="M21 30L29 30L25 23ZM35 30L43 30L39 23ZM30 37L34 37L32 33.5Z" fill="#ffd25e" />
      <path
        d="M18 40Q32 51 46 40L42 41.5L40 45L36 42.5L32 46L28 42.5L24 45L22 41.5Z"
        fill="#ffd25e"
      />
    </svg>
  );
}

/** Page-level decorations: corner webs, a spider, bats and a pumpkin patch. */
export function Decorations() {
  return (
    <div aria-hidden>
      <i className="fx fx-cobwebs fx-web fx-left">
        <Web />
      </i>
      <i className="fx fx-cobwebs fx-web fx-right">
        <Web />
      </i>
      <div className="fx fx-cobwebs fx-spider">
        <span className="fx-thread" />
        <Spider />
      </div>
      <i className="fx fx-bats fx-bat fx-b1">
        <Bat />
      </i>
      <i className="fx fx-bats fx-bat fx-b2">
        <Bat />
      </i>
      <i className="fx fx-bats fx-bat fx-b3">
        <Bat />
      </i>
      <div className="fx fx-pumpkins fx-patch">
        <i>
          <Pumpkin />
        </i>
        <i>
          <Pumpkin />
        </i>
        <i>
          <Pumpkin />
        </i>
      </div>
    </div>
  );
}
