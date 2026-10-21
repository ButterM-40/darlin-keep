import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TITLE_MAX, toNotebookView } from "@/lib/notebooks";

/** Adds a notebook to a character. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { title?: unknown };
  const title = String(body.title ?? "").trim().slice(0, TITLE_MAX) || "Untitled notebook";

  const character = await prisma.character.findUnique({ where: { id }, select: { id: true } });
  if (!character) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const notebook = await prisma.notebook.create({ data: { characterId: id, title } });
  return NextResponse.json(toNotebookView(notebook));
}
