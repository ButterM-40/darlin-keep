import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import {
  BUILT_IN_THEMES,
  DEFAULT_THEME,
  THEME_COOKIE,
  inSeason,
  isCardStyle,
  monthDay,
  sanitizeTheme,
  type CardStyle,
  type Theme,
} from "@/lib/themes";

export interface PartyLook {
  themeId: string;
  seasonal: boolean;
  cardStyle: CardStyle;
}

/** Built-ins first, then the party's saved themes by name. */
export async function listThemes(): Promise<Theme[]> {
  const rows = await prisma.theme.findMany({ orderBy: { name: "asc" } });
  // Rows were sanitized on the way in; doing it again on the way out means a
  // hand-edited row still cannot put anything odd into the page.
  const saved = rows.map((row) => ({
    ...sanitizeTheme(row),
    id: row.id,
    builtIn: false,
  }));
  return [...BUILT_IN_THEMES, ...saved];
}

export async function getPartyLook(): Promise<PartyLook> {
  const row = await prisma.partySettings.findUnique({ where: { id: "party" } });
  return {
    themeId: row?.themeId ?? DEFAULT_THEME.id,
    seasonal: row?.seasonal ?? true,
    cardStyle: isCardStyle(row?.cardStyle) ? row.cardStyle : "banner",
  };
}

export interface ActiveTheme {
  theme: Theme;
  /** Why this theme is showing, for the Themes page. */
  source: "browser" | "season" | "party";
  /** This browser's override, if it names a theme that still exists. */
  browserThemeId: string | null;
  themes: Theme[];
  look: PartyLook;
}

/**
 * This browser's pick wins, then a theme whose season is on (unless the party
 * turned that off), then the party default.
 */
export async function getActiveTheme(now = new Date()): Promise<ActiveTheme> {
  const [themes, look, jar] = await Promise.all([listThemes(), getPartyLook(), cookies()]);
  const byId = (id: string | undefined) => (id ? themes.find((t) => t.id === id) : undefined);

  const browser = byId(jar.get(THEME_COOKIE)?.value);
  if (browser) {
    return { theme: browser, source: "browser", browserThemeId: browser.id, themes, look };
  }

  if (look.seasonal) {
    const today = monthDay(now);
    const seasonal = themes.find((t) => inSeason(t.season, today));
    if (seasonal) {
      return { theme: seasonal, source: "season", browserThemeId: null, themes, look };
    }
  }

  return {
    theme: byId(look.themeId) ?? DEFAULT_THEME,
    source: "party",
    browserThemeId: null,
    themes,
    look,
  };
}
