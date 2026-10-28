import type { Prisma } from "@/lib/generated/prisma/client";
import type { Status } from "@/lib/status";
import { prisma } from "@/lib/db";
import { fillTemplate, type FieldValues } from "@/lib/pdf/fillTemplate";
import { deriveDisplay } from "@/lib/roles";
import { deleteFileIfOrphaned } from "@/lib/storage";

export function asFieldValues(value: unknown): FieldValues {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: FieldValues = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (typeof v === "number" || typeof v === "boolean") out[k] = String(v);
  }
  return out;
}

async function roleFields(templateId: string) {
  return prisma.templateField.findMany({
    where: { templateId, role: { not: null } },
    select: { pdfName: true, role: true },
  });
}

/** Creates a character on one campaign's roster, in the given row. */
export async function createCharacter(input: {
  templateId: string;
  ownerId: string;
  campaignId: string;
  status?: Status;
  values?: FieldValues;
}) {
  const values = input.values ?? {};
  const { displayName, summary } = deriveDisplay(
    await roleFields(input.templateId),
    values,
  );

  return prisma.character.create({
    data: {
      templateId: input.templateId,
      ownerId: input.ownerId,
      campaigns: {
        create: { campaignId: input.campaignId, status: input.status ?? "ALIVE" },
      },
      displayName,
      summary: summary as unknown as Prisma.InputJsonValue,
      values: values as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function updateCharacter(
  id: string,
  patch: { values?: FieldValues; ownerId?: string },
) {
  const existing = await prisma.character.findUnique({
    where: { id },
    select: { templateId: true, values: true },
  });
  if (!existing) return null;

  const data: Prisma.CharacterUpdateInput = {};
  if (patch.ownerId) data.owner = { connect: { id: patch.ownerId } };

  if (patch.values) {
    // The editor always sends the whole sheet, so replace rather than merge.
    const { displayName, summary } = deriveDisplay(
      await roleFields(existing.templateId),
      patch.values,
    );
    data.values = patch.values as unknown as Prisma.InputJsonValue;
    data.displayName = displayName;
    data.summary = summary as unknown as Prisma.InputJsonValue;
  }

  return prisma.character.update({ where: { id }, data });
}

/** Renders a character's sheet as a real PDF. */
export async function renderCharacterPdf(id: string, flatten: boolean) {
  const character = await prisma.character.findUnique({
    where: { id },
    select: {
      displayName: true,
      values: true,
      template: { select: { pdf: true } },
    },
  });
  if (!character) return null;

  const bytes = await fillTemplate(
    new Uint8Array(character.template.pdf),
    asFieldValues(character.values),
    { flatten },
  );
  return { bytes, displayName: character.displayName };
}

/** Deletes a character and, once nothing else uses it, its portrait. */
export async function deleteCharacter(id: string) {
  const { portraitFileId } = await prisma.character.delete({
    where: { id },
    select: { portraitFileId: true },
  });
  if (portraitFileId) await deleteFileIfOrphaned(portraitFileId);
}
