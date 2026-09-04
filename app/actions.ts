"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createCharacter } from "@/lib/characters";
import { isStatus } from "@/lib/status";
import { createTemplate } from "@/lib/templates";
import { deleteFileIfOrphaned } from "@/lib/storage";

// The roster is a client component holding its own optimistic state, so these
// take plain arguments rather than form data.

export async function moveCharacter(id: string, status: string) {
  if (!isStatus(status)) return;

  await prisma.character.update({ where: { id }, data: { status } });
  revalidatePath("/");
}

export async function assignOwner(id: string, ownerId: string) {
  if (!ownerId) return;

  await prisma.character.update({ where: { id }, data: { ownerId } });
  revalidatePath("/");
}

export async function removeCharacter(id: string) {
  await prisma.character.delete({ where: { id } });
  revalidatePath("/");
}

export async function addOwner(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await prisma.owner.upsert({
    where: { name },
    update: { color: String(formData.get("color") ?? "") || undefined },
    create: { name, color: String(formData.get("color") ?? "") || null },
  });
  revalidatePath("/owners");
  revalidatePath("/");
}

export async function removeOwner(formData: FormData) {
  const id = String(formData.get("id"));
  const count = await prisma.character.count({ where: { ownerId: id } });
  // Owners are referenced by characters; removing one would orphan them.
  if (count === 0) await prisma.owner.delete({ where: { id } });
  revalidatePath("/owners");
}

export async function newCharacter(formData: FormData) {
  const templateId = String(formData.get("templateId"));
  const ownerId = String(formData.get("ownerId"));
  const status = String(formData.get("status") ?? "ALIVE");
  if (!templateId || !ownerId) return;

  const character = await createCharacter({
    templateId,
    ownerId,
    status: isStatus(status) ? status : "ALIVE",
  });
  revalidatePath("/");
  redirect(`/characters/${character.id}`);
}

export async function uploadTemplate(formData: FormData) {
  const file = formData.get("pdf");
  const name = String(formData.get("name") ?? "").trim();
  if (!(file instanceof File) || !name) return;

  const template = await createTemplate({
    name,
    bytes: new Uint8Array(await file.arrayBuffer()),
    blank: formData.get("blank") === "on",
  });
  revalidatePath("/templates");
  redirect(`/templates/${template.id}/roles`);
}

export async function deleteTemplate(formData: FormData) {
  const id = String(formData.get("id"));
  const count = await prisma.character.count({ where: { templateId: id } });
  if (count === 0) await prisma.template.delete({ where: { id } });
  revalidatePath("/templates");
}

export async function deleteDocument(id: string) {
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { fileId: true, items: { select: { fileId: true } } },
  });
  if (!doc) return;

  // Board items cascade, but their bytes do not, so collect the ids first.
  const fileIds = [doc.fileId, ...doc.items.map((i) => i.fileId)].filter(
    (id): id is string => Boolean(id),
  );

  await prisma.document.delete({ where: { id } });
  for (const fileId of fileIds) await deleteFileIfOrphaned(fileId);

  revalidatePath("/documents");
}

export async function renameDocument(id: string, title: string, note: string) {
  const trimmed = title.trim();
  if (!trimmed) return;

  await prisma.document.update({
    where: { id },
    data: { title: trimmed, note: note.trim() || null },
  });
  revalidatePath("/documents");
  revalidatePath(`/documents/${id}`);
}
