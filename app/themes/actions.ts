"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { getPartyLook, listThemes } from "@/lib/themeStore";
import {
  BUILT_IN_THEMES,
  THEME_COOKIE,
  inSeason,
  isCardStyle,
  monthDay,
  sanitizeTheme,
  type Theme,
} from "@/lib/themes";

// Every page wears the theme, so any change re-renders the whole tree.
function refreshAll() {
  revalidatePath("/", "layout");
}

async function exists(id: string): Promise<boolean> {
  return (await listThemes()).some((t) => t.id === id);
}

/** Pins a theme in this browser, or with null goes back to following the party. */
export async function setBrowserTheme(id: string | null) {
  const jar = await cookies();
  if (id && (await exists(id))) {
    jar.set(THEME_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365 * 5, sameSite: "lax" });
  } else {
    jar.delete(THEME_COOKIE);
  }
  refreshAll();
}

export async function setPartyTheme(id: string) {
  if (!(await exists(id))) return;
  await prisma.partySettings.upsert({
    where: { id: "party" },
    update: { themeId: id },
    create: { id: "party", themeId: id },
  });
  refreshAll();
}

export async function setSeasonal(seasonal: boolean) {
  await prisma.partySettings.upsert({
    where: { id: "party" },
    update: { seasonal },
    create: { id: "party", seasonal },
  });
  refreshAll();
}

export async function setCardStyle(cardStyle: string) {
  if (!isCardStyle(cardStyle)) return;
  await prisma.partySettings.upsert({
    where: { id: "party" },
    update: { cardStyle },
    create: { id: "party", cardStyle },
  });
  refreshAll();
}

/**
 * Saves a theme under its name, replacing a saved theme of the same name.
 * Built-in names are taken, so a copy of one gets " (custom)" added.
 *
 * Saving also puts the theme on the site: it becomes the party default, this
 * browser stops overriding, and if another theme's season would cover it up
 * right now, seasonal switching is turned off (`seasonalOff` names that theme).
 */
export async function saveTheme(
  raw: unknown,
): Promise<
  { ok: true; theme: Theme; seasonalOff: string | null } | { ok: false; error: string }
> {
  const data = sanitizeTheme(raw);
  const taken = BUILT_IN_THEMES.some((t) => t.name.toLowerCase() === data.name.toLowerCase());
  if (taken) data.name = `${data.name} (custom)`.slice(0, 40);

  const fields = {
    mood: data.mood,
    mode: data.mode,
    font: data.font,
    colors: data.colors,
    // Saving without a season clears an old one rather than keeping it.
    season: data.season ? { ...data.season } : Prisma.DbNull,
    effects: data.effects,
  };

  try {
    const row = await prisma.theme.upsert({
      where: { name: data.name },
      update: fields,
      create: { name: data.name, ...fields },
    });

    const [themes, look] = await Promise.all([listThemes(), getPartyLook()]);
    const today = monthDay(new Date());
    const covering = look.seasonal ? themes.find((t) => inSeason(t.season, today)) : undefined;
    const seasonalOff = covering && covering.id !== row.id ? covering.name : null;

    await prisma.partySettings.upsert({
      where: { id: "party" },
      update: { themeId: row.id, ...(seasonalOff ? { seasonal: false } : {}) },
      create: { id: "party", themeId: row.id, seasonal: !seasonalOff },
    });
    (await cookies()).delete(THEME_COOKIE);

    refreshAll();
    return { ok: true, theme: { ...data, id: row.id, builtIn: false }, seasonalOff };
  } catch {
    return { ok: false, error: "Couldn't save that theme. Try again in a moment." };
  }
}

export async function deleteTheme(id: string) {
  await prisma.theme.deleteMany({ where: { id } });
  // Anything still pointing at it falls back to Ember Hearth when read.
  await prisma.partySettings.updateMany({
    where: { themeId: id },
    data: { themeId: BUILT_IN_THEMES[0].id },
  });
  const jar = await cookies();
  if (jar.get(THEME_COOKIE)?.value === id) jar.delete(THEME_COOKIE);
  refreshAll();
}
