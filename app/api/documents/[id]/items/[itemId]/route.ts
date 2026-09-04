import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteFileIfOrphaned } from "@/lib/storage";

/** Saves where an image was left, or its caption. */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await context.params;
  const body = (await request.json()) as {
    x?: number;
    y?: number;
    w?: number;
    h?: number;
    z?: number;
    caption?: string | null;
  };

  const item = await prisma.boardItem.findFirst({
    where: { id: itemId, documentId: id },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, number | string | null> = {};
  for (const key of ["x", "y", "w", "h", "z"] as const) {
    const value = body[key];
    if (typeof value === "number" && Number.isFinite(value)) data[key] = value;
  }
  if (body.caption !== undefined) data.caption = body.caption?.trim() || null;

  await prisma.boardItem.update({ where: { id: itemId }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await context.params;

  const item = await prisma.boardItem.findFirst({
    where: { id: itemId, documentId: id },
    select: { id: true, fileId: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.boardItem.delete({ where: { id: itemId } });
  await deleteFileIfOrphaned(item.fileId);
  return NextResponse.json({ ok: true });
}
