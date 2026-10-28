import { ThemeStudio } from "@/components/ThemeStudio";
import { getActiveTheme } from "@/lib/themeStore";

export const dynamic = "force-dynamic";

// Reachable at /themes; deliberately not linked from the header.
export default async function ThemesPage() {
  const { theme, source, browserThemeId, themes, look } = await getActiveTheme();

  return (
    <ThemeStudio
      themes={themes}
      activeId={theme.id}
      source={source}
      browserThemeId={browserThemeId}
      look={look}
    />
  );
}
