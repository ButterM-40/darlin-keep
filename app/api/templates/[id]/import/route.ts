import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readValues } from "@/lib/pdf/fillTemplate";
import { createCharacter } from "@/lib/characters";
import { isStatus } from "@/lib/status";

/** Creates a character from an already-filled copy of this sheet. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("pdf");
  const ownerId = String(form.get("ownerId") ?? "");
  const statusRaw = String(form.get("status") ?? "ALIVE");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a filled PDF." }, { status: 400 });
  }
  if (!ownerId) {
    return NextResponse.json({ error: "Pick an owner." }, { status: 400 });
  }

  const template = await prisma.template.findUnique({
    where: { id },
    select: { id: true, fields: { select: { pdfName: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Unknown sheet." }, { status: 404 });
  }

  try {
    const values = await readValues(new Uint8Array(await file.arrayBuffer()));
    const known = new Set(template.fields.map((f) => f.pdfName));
    const matched = Object.fromEntries(
      Object.entries(values).filter(([name]) => known.has(name)),
    );

    if (Object.keys(matched).length === 0) {
      return NextResponse.json(
        {
          error:
            "None of that PDF's fields match this sheet. Make sure it is a filled copy of the same sheet.",
        },
        { status: 400 },
      );
    }

    const character = await createCharacter({
      templateId: id,
      ownerId,
      status: isStatus(statusRaw) ? statusRaw : "ALIVE",
      values: matched,
    });

    return NextResponse.json({
      id: character.id,
      displayName: character.displayName,
      imported: Object.keys(matched).length,
      skipped: Object.keys(values).length - Object.keys(matched).length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That file could not be read as a PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
