import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createTemplate } from "@/lib/templates";

export async function GET() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      pageCount: true,
      createdAt: true,
      _count: { select: { fields: true, characters: true } },
    },
  });
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("pdf");
  const name = String(form.get("name") ?? "").trim();
  const blank = form.get("blank") === "true";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF to upload." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Give the sheet a name." }, { status: 400 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const template = await createTemplate({ name, bytes, blank });
    return NextResponse.json({
      id: template.id,
      name: template.name,
      fieldCount: template._count.fields,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That file could not be read as a PDF.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
