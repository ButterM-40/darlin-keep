import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, formatBytes } from "@/lib/documents";
import { deleteFileIfOrphaned, putFile } from "@/lib/storage";

async function find(id: string) {
  return prisma.character.findUnique({
    where: { id },
    select: { portraitFileId: true, updatedAt: true },
  });
}

/**
 * Swaps the portrait. updatedAt is written back unchanged: a picture is not a
 * sheet edit, and bumping it would make an open sheet editor report a
 * conflicting save that never happened.
 */
async function setPortrait(
  id: string,
  existing: { portraitFileId: string | null; updatedAt: Date },
  fileId: string | null,
) {
  await prisma.character.update({
    where: { id },
    data: { portraitFileId: fileId, updatedAt: existing.updatedAt },
  });
  if (existing.portraitFileId && existing.portraitFileId !== fileId) {
    await deleteFileIfOrphaned(existing.portraitFileId);
  }
  revalidatePath("/");
  revalidatePath(`/characters/${id}`);
}

/** Sets a character's picture from one uploaded image. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await find(id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const form = await request.formData();
  const file = form.get("image");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a picture." }, { status: 400 });
  }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return NextResponse.json(
      { error: `${file.name} is not an image we can show. Pick a JPG, PNG or WebP.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.` },
      { status: 400 },
    );
  }

  const stored = await putFile({
    bytes: new Uint8Array(await file.arrayBuffer()),
    mimeType: file.type,
    fileName: file.name || "portrait",
  });
  await setPortrait(id, existing, stored.id);
  return NextResponse.json({ portraitFileId: stored.id });
}

/** Removes the picture; the card goes back to having no picture at all. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await find(id);
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await setPortrait(id, existing, null);
  return NextResponse.json({ portraitFileId: null });
}
