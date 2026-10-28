/**
 * Themes fill the same color slots app/globals.css declares in @theme, plus a
 * heading font, a light/dark mode, an optional season and optional
 * decorations. This module has no server imports so the /themes editor can
 * use the same validation and the same variable map as the layout.
 *
 * A theme file is plain data. Only known slot names, hex colors, fonts from
 * FONTS and decorations from EFFECTS get through `sanitizeTheme`, so a shared
 * file can never carry CSS or script into the page.
 */

export const THEME_FORMAT = "darlin-keep-theme@1";

export const COLOR_KEYS = [
  "ink-900",
  "ink-800",
  "ink-700",
  "ink-600",
  "ink-500",
  "parchment",
  "parchment-dim",
  "ember",
  "ember-dim",
  "gold",
  "moss",
  "blood",
  "glow-1",
  "glow-2",
  "cork",
  "owner-default",
] as const;

export type ColorKey = (typeof COLOR_KEYS)[number];
export type ThemeColors = Record<ColorKey, string>;
export type ThemeMode = "dark" | "light";

/** Editor groups. ember-dim is derived from ember, so it is not listed. */
export const COLOR_GROUPS: { title: string; keys: [ColorKey, string][] }[] = [
  {
    title: "Surfaces",
    keys: [
      ["ink-900", "Page"],
      ["ink-800", "Cards"],
      ["ink-700", "Raised"],
      ["ink-600", "Lines"],
      ["ink-500", "Borders"],
    ],
  },
  {
    title: "Text",
    keys: [
      ["parchment", "Text"],
      ["parchment-dim", "Muted text"],
    ],
  },
  {
    title: "Meaning",
    keys: [
      ["ember", "Accent"],
      ["gold", "Highlight"],
      ["moss", "Success"],
      ["blood", "Danger"],
    ],
  },
  {
    title: "Atmosphere",
    keys: [
      ["glow-1", "Glow left"],
      ["glow-2", "Glow right"],
      ["cork", "Corkboard"],
      ["owner-default", "No owner"],
    ],
  },
];

/** Heading fonts a theme may name. `google` is the Google Fonts family to load, if any. */
export const FONTS: Record<string, { stack: string; google: string | null }> = {
  "Iowan Old Style": {
    stack: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
    google: null,
  },
  Cinzel: { stack: '"Cinzel", "Trajan Pro", Georgia, serif', google: "Cinzel:wght@400;600" },
  Creepster: { stack: '"Creepster", Impact, Georgia, serif', google: "Creepster" },
  "Uncial Antiqua": { stack: '"Uncial Antiqua", Georgia, serif', google: "Uncial+Antiqua" },
  "Alegreya SC": { stack: '"Alegreya SC", Georgia, serif', google: "Alegreya+SC:wght@400;500" },
  "Pirata One": { stack: '"Pirata One", Georgia, serif', google: "Pirata+One" },
  Marcellus: { stack: '"Marcellus", Georgia, serif', google: "Marcellus" },
  "IM Fell English": { stack: '"IM Fell English", Georgia, serif', google: "IM+Fell+English" },
  "Atkinson Hyperlegible": {
    stack: '"Atkinson Hyperlegible", ui-sans-serif, system-ui, sans-serif',
    google: "Atkinson+Hyperlegible:wght@400;700",
  },
};

export const FONT_NAMES = Object.keys(FONTS);

/** Decorations the site knows how to draw. A theme can only name these. */
export const EFFECTS = {
  cobwebs: "Cobwebs & spiders",
  pumpkins: "Pumpkins",
  bats: "Bats",
} as const;

export type Effect = keyof typeof EFFECTS;
export const EFFECT_NAMES = Object.keys(EFFECTS) as Effect[];

/** An MM-DD range. `to` before `from` wraps over New Year. */
export interface Season {
  from: string;
  to: string;
}

export interface ThemeData {
  name: string;
  mood: string;
  mode: ThemeMode;
  font: string;
  season: Season | null;
  effects: Effect[];
  colors: ThemeColors;
}

/** A theme as the app passes it around: built-ins have slug ids, saved ones cuids. */
export interface Theme extends ThemeData {
  id: string;
  builtIn: boolean;
}

function builtIn(
  id: string,
  name: string,
  mood: string,
  mode: ThemeMode,
  font: string,
  colors: ThemeColors,
  season: Season | null = null,
  effects: Effect[] = [],
): Theme {
  return { id, builtIn: true, name, mood, mode, font, colors, season, effects };
}

export const BUILT_IN_THEMES: Theme[] = [
  builtIn("ember-hearth", "Ember Hearth", "The original look. Firelight on old leather.", "dark", "Iowan Old Style", {
    "ink-900": "#0f0d0b", "ink-800": "#171310", "ink-700": "#211b16", "ink-600": "#2e251e", "ink-500": "#3d3128",
    parchment: "#efe3cf", "parchment-dim": "#bfae94",
    ember: "#d8763a", "ember-dim": "#a2542450", gold: "#d9b45b", moss: "#6f9c5a", blood: "#b3453c",
    "glow-1": "#241c15", "glow-2": "#1d2119", cork: "#2a2118", "owner-default": "#8a7f6d",
  }),
  builtIn("all-hallows-eve", "All Hallows' Eve", "Pumpkin orange, candlelight and witch's-brew green on a moonless night.", "dark", "Creepster", {
    "ink-900": "#0e0a10", "ink-800": "#161019", "ink-700": "#201725", "ink-600": "#2e2134", "ink-500": "#3f2d47",
    parchment: "#f1e6d8", "parchment-dim": "#b5a3b8",
    ember: "#ff7a1a", "ember-dim": "#c2550f50", gold: "#e8c547", moss: "#8fd14f", blood: "#e0466e",
    "glow-1": "#2a1636", "glow-2": "#2b1508", cork: "#1d1420", "owner-default": "#8f8293",
  }, { from: "10-01", to: "10-31" }, ["cobwebs", "pumpkins", "bats"]),
  builtIn("moonlit-archive", "Moonlit Archive", "Cool slate and silver. A wizard's library after midnight.", "dark", "Cinzel", {
    "ink-900": "#0b0e14", "ink-800": "#111520", "ink-700": "#181e2b", "ink-600": "#232b3b", "ink-500": "#313b4f",
    parchment: "#e4e8f0", "parchment-dim": "#9aa6ba",
    ember: "#8fb3e8", "ember-dim": "#5a7fb850", gold: "#d6c79a", moss: "#7fb39a", blood: "#d06a6a",
    "glow-1": "#1a2236", "glow-2": "#1d1a2e", cork: "#1c2230", "owner-default": "#7d8699",
  }),
  builtIn("feywild-grove", "Feywild Grove", "Deep moss with violet fey light.", "dark", "Uncial Antiqua", {
    "ink-900": "#0c120e", "ink-800": "#111a14", "ink-700": "#18241b", "ink-600": "#223326", "ink-500": "#2f4434",
    parchment: "#eef0dc", "parchment-dim": "#a9b596",
    ember: "#c792e0", "ember-dim": "#8a5aa850", gold: "#e6cf6a", moss: "#8cc86b", blood: "#d8655e",
    "glow-1": "#1d2a1a", "glow-2": "#241a2a", cork: "#1b261c", "owner-default": "#8a9479",
  }),
  builtIn("underdark", "Underdark", "Purple-black caverns lit by glowing fungus.", "dark", "Alegreya SC", {
    "ink-900": "#0d0a12", "ink-800": "#141019", "ink-700": "#1c1624", "ink-600": "#282033", "ink-500": "#382c46",
    parchment: "#e9e1f2", "parchment-dim": "#a898bb",
    ember: "#5ec8b4", "ember-dim": "#3a8f8050", gold: "#e0b46a", moss: "#79c08a", blood: "#e0607a",
    "glow-1": "#1f1430", "glow-2": "#0f2226", cork: "#1e1828", "owner-default": "#8a7f99",
  }),
  builtIn("infernal-court", "Infernal Court", "Brimstone, brass and a contract you shouldn't sign.", "dark", "Pirata One", {
    "ink-900": "#120909", "ink-800": "#1a0d0c", "ink-700": "#251311", "ink-600": "#351b18", "ink-500": "#4a2620",
    parchment: "#f3e2d6", "parchment-dim": "#c4a08f",
    ember: "#e8513a", "ember-dim": "#b0302050", gold: "#e2b04a", moss: "#8ea65a", blood: "#e25c86",
    "glow-1": "#2c0f0c", "glow-2": "#22140a", cork: "#2a1512", "owner-default": "#94796f",
  }),
  builtIn("sunken-temple", "Sunken Temple", "Drowned stone, sea-glass teal, coral.", "dark", "Marcellus", {
    "ink-900": "#071214", "ink-800": "#0b1a1d", "ink-700": "#102428", "ink-600": "#173237", "ink-500": "#21444a",
    parchment: "#e2efe9", "parchment-dim": "#93b3ab",
    ember: "#f08a6c", "ember-dim": "#b8604650", gold: "#e6c873", moss: "#6fbf8f", blood: "#e0566a",
    "glow-1": "#0e2a2e", "glow-2": "#13213a", cork: "#0f2326", "owner-default": "#7a958f",
  }),
  builtIn("scriptorium", "Scriptorium", "Light mode. Vellum, lapis ink and gold leaf.", "light", "IM Fell English", {
    "ink-900": "#f6f0e2", "ink-800": "#eee4cf", "ink-700": "#e4d6ba", "ink-600": "#d3c09e", "ink-500": "#b9a27c",
    parchment: "#271d14", "parchment-dim": "#5f4e3c",
    ember: "#2d4f96", "ember-dim": "#2d4f9630", gold: "#94690c", moss: "#3f6e2c", blood: "#a3271d",
    "glow-1": "#fcf8ee", "glow-2": "#ebe3d2", cork: "#c9b08a", "owner-default": "#8a7f6d",
  }),
  builtIn("high-contrast", "High Contrast", "Maximum legibility for dim rooms and tired eyes.", "dark", "Atkinson Hyperlegible", {
    "ink-900": "#000000", "ink-800": "#0b0b0b", "ink-700": "#161616", "ink-600": "#3a3a3a", "ink-500": "#707070",
    parchment: "#ffffff", "parchment-dim": "#d8d8d8",
    ember: "#ffb02e", "ember-dim": "#ffb02e55", gold: "#ffd84a", moss: "#5fe08a", blood: "#ff6b6b",
    "glow-1": "#000000", "glow-2": "#000000", cork: "#141414", "owner-default": "#b0b0b0",
  }),
];

export const DEFAULT_THEME = BUILT_IN_THEMES[0];

export function findBuiltIn(id: string): Theme | undefined {
  return BUILT_IN_THEMES.find((t) => t.id === id);
}

export function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function sanitizeSeason(raw: unknown): Season | null {
  if (!raw || typeof raw !== "object") return null;
  const { from, to } = raw as Record<string, unknown>;
  if (typeof from !== "string" || typeof to !== "string") return null;
  return MONTH_DAY.test(from) && MONTH_DAY.test(to) ? { from, to } : null;
}

export function dimFor(ember: string, mode: ThemeMode): string {
  return ember.slice(0, 7) + (mode === "light" ? "30" : "50");
}

/**
 * Turns anything into a valid theme. Unknown keys are dropped and missing or
 * invalid colors fall back to Ember Hearth, so older files keep loading when
 * new slots are added.
 */
export function sanitizeTheme(raw: unknown): ThemeData {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawColors =
    src.colors && typeof src.colors === "object" ? (src.colors as Record<string, unknown>) : {};
  const mode: ThemeMode = src.mode === "light" ? "light" : "dark";

  const colors = {} as ThemeColors;
  for (const key of COLOR_KEYS) {
    const value = rawColors[key];
    colors[key] = isHex(value) ? value.toLowerCase() : DEFAULT_THEME.colors[key];
  }
  if (!isHex(rawColors["ember-dim"])) colors["ember-dim"] = dimFor(colors.ember, mode);

  const name = typeof src.name === "string" ? src.name.trim().slice(0, 40) : "";
  const effects = Array.isArray(src.effects)
    ? EFFECT_NAMES.filter((e) => (src.effects as unknown[]).includes(e))
    : [];

  return {
    name: name || "Untitled theme",
    mood: typeof src.mood === "string" ? src.mood.trim().slice(0, 90) : "",
    mode,
    font: typeof src.font === "string" && src.font in FONTS ? src.font : DEFAULT_THEME.font,
    season: sanitizeSeason(src.season),
    effects,
    colors,
  };
}

/** Parses a theme file, saying what was wrong with it in words a player can act on. */
export function parseThemeFile(
  text: string,
): { ok: true; theme: ThemeData; skipped: string[] } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      ok: false,
      error: "That isn't valid JSON. Check for a missing comma or quote, then try again.",
    };
  }
  if (!raw || typeof raw !== "object" || (raw as { format?: unknown }).format !== THEME_FORMAT) {
    return {
      ok: false,
      error: `This file isn't a Darlin Keep theme. It needs "format": "${THEME_FORMAT}".`,
    };
  }
  const colors = (raw as { colors?: unknown }).colors;
  const skipped =
    colors && typeof colors === "object"
      ? Object.entries(colors as Record<string, unknown>)
          .filter(([k, v]) => !(COLOR_KEYS as readonly string[]).includes(k) || !isHex(v))
          .map(([k]) => k)
      : [];
  return { ok: true, theme: sanitizeTheme(raw), skipped };
}

export function themeToJson(theme: ThemeData): string {
  return JSON.stringify(
    {
      format: THEME_FORMAT,
      name: theme.name,
      mood: theme.mood || undefined,
      mode: theme.mode,
      font: theme.font,
      season: theme.season ?? undefined,
      effects: theme.effects.length ? theme.effects : undefined,
      colors: theme.colors,
    },
    null,
    2,
  );
}

/**
 * Every custom property a theme sets. The layout writes these into a <style>
 * tag and the editor previews by setting the same names on <html>, so there is
 * exactly one mapping from a theme to the page.
 */
export function themeVars(theme: ThemeData): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of COLOR_KEYS) vars[`--color-${key}`] = theme.colors[key];
  vars["--font-display"] = (FONTS[theme.font] ?? FONTS[DEFAULT_THEME.font]).stack;
  vars["color-scheme"] = theme.mode;
  for (const effect of EFFECT_NAMES) {
    const on = theme.effects.includes(effect);
    vars[`--fx-${effect}`] = on ? "block" : "none";
  }
  // Pumpkins appear inline beside the logo and as a patch in the corner.
  const pumpkins = theme.effects.includes("pumpkins");
  vars["--fx-pumpkins-inline"] = pumpkins ? "inline-block" : "none";
  vars["--fx-pumpkins-flex"] = pumpkins ? "flex" : "none";
  return vars;
}

/** `html:root` outranks Tailwind's `:root` rule wherever the tag lands. */
export function themeCss(theme: ThemeData): string {
  const body = Object.entries(themeVars(theme))
    .map(([k, v]) => `${k}:${v};`)
    .join("");
  return `html:root{${body}}`;
}

export function googleFontsHref(fonts: string[]): string | null {
  const families = fonts.map((f) => FONTS[f]?.google).filter((g): g is string => Boolean(g));
  if (families.length === 0) return null;
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join("&")}&display=swap`;
}

export function monthDay(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function inSeason(season: Season | null, today: string): boolean {
  if (!season) return false;
  return season.from <= season.to
    ? today >= season.from && today <= season.to
    : today >= season.from || today <= season.to;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function seasonLabel(season: Season): string {
  const [fm, fd] = season.from.split("-").map(Number);
  const [tm, td] = season.to.split("-").map(Number);
  return `${MONTHS[fm - 1]} ${fd}–${fm === tm ? "" : `${MONTHS[tm - 1]} `}${td}`;
}

/** How a character with a picture is drawn on the roster. */
export const CARD_STYLES = {
  avatar: "Avatar",
  banner: "Banner",
  portrait: "Portrait",
} as const;

export type CardStyle = keyof typeof CARD_STYLES;

export function isCardStyle(value: unknown): value is CardStyle {
  return typeof value === "string" && value in CARD_STYLES;
}

/** Browser override cookie. Absent means "follow the party". */
export const THEME_COOKIE = "dk-theme";

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
