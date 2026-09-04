import type { FieldValues } from "@/lib/pdf/fillTemplate";

/**
 * The handful of fields worth naming by hand. Everything else on a sheet stays
 * anonymous: the editor positions it from geometry and never needs to know what
 * it means. These five are only what the roster has to display.
 */
export const ROLES = [
  { key: "displayName", label: "Character name", required: true },
  { key: "species", label: "Species", required: false },
  { key: "classLevel", label: "Class & level", required: false },
  { key: "hp", label: "Hit points", required: false },
  { key: "xp", label: "Experience", required: false },
] as const;

export type RoleKey = (typeof ROLES)[number]["key"];

export const ROLE_KEYS = ROLES.map((r) => r.key) as readonly RoleKey[];

export function isRoleKey(value: string): value is RoleKey {
  return (ROLE_KEYS as readonly string[]).includes(value);
}

export interface CharacterSummary {
  species?: string;
  classLevel?: string;
  hp?: string;
  xp?: string;
}

export interface RoleSource {
  pdfName: string;
  role: string | null;
}

export const UNNAMED = "Unnamed character";

/**
 * Pulls the roster-visible strings out of a raw field map. A role may be
 * assigned to a field the character has left blank, which is fine: the roster
 * simply omits it.
 */
export function deriveDisplay(
  fields: RoleSource[],
  values: FieldValues,
): { displayName: string; summary: CharacterSummary } {
  const byRole = new Map<string, string>();
  for (const field of fields) {
    if (!field.role) continue;
    const value = values[field.pdfName]?.trim();
    if (value && !byRole.has(field.role)) byRole.set(field.role, value);
  }

  return {
    displayName: byRole.get("displayName") || UNNAMED,
    summary: {
      species: byRole.get("species"),
      classLevel: byRole.get("classLevel"),
      hp: byRole.get("hp"),
      xp: byRole.get("xp"),
    },
  };
}
