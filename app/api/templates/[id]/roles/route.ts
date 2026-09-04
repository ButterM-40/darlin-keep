import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deriveDisplay, isRoleKey } from "@/lib/roles";
import { asFieldValues } from "@/lib/characters";
import type { Prisma } from "@/lib/generated/prisma/client";

/** Body: { roles: { [roleKey]: fieldId | null } } */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { roles?: Record<string, string | null> };
  const roles = body.roles ?? {};

  const assignments = Object.entries(roles).filter(([key]) => isRoleKey(key));

  await prisma.$transaction([
    // A role is unique per template, so clear the old holders first.
    prisma.templateField.updateMany({
      where: { templateId: id, role: { in: assignments.map(([key]) => key) } },
      data: { role: null },
    }),
    ...assignments
      .filter(([, fieldId]) => Boolean(fieldId))
      .map(([key, fieldId]) =>
        prisma.templateField.update({
          where: { id: fieldId as string },
          data: { role: key },
        }),
      ),
  ]);

  // Roster labels are denormalised, so refresh every character on this sheet.
  const fields = await prisma.templateField.findMany({
    where: { templateId: id, role: { not: null } },
    select: { pdfName: true, role: true },
  });
  const characters = await prisma.character.findMany({
    where: { templateId: id },
    select: { id: true, values: true },
  });

  for (const character of characters) {
    const { displayName, summary } = deriveDisplay(
      fields,
      asFieldValues(character.values),
    );
    await prisma.character.update({
      where: { id: character.id },
      data: { displayName, summary: summary as unknown as Prisma.InputJsonValue },
    });
  }

  return NextResponse.json({ ok: true, refreshed: characters.length });
}
