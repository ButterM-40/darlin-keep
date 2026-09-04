import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  ALLOWED_IMAGE_TYPES,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  MAX_UPLOAD_BYTES,
  formatBytes,
} from "@/lib/documents";
import { putFile } from "@/lib/storage";

/** Pins one or more images onto a board. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const board = await prisma.document.findUnique({
    where: { id },
    select: { id: true, kind: true },
  });
  if (!board || board.kind !== "BOARD") {
    return NextResponse.json({ error: "Not a board." }, { status: 404 });
  }

  const form = await request.formData();
  const files = form.getAll("images").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Choose an image." }, { status: 400 });
  }

  // The client measures each image before upload and sends the size it should
  // start at, so the server does not need an image-decoding dependency.
  const sizes = form.getAll("sizes").map((s) => String(s));
  const dropX = Number(form.get("x") ?? 40);
  const dropY = Number(form.get("y") ?? 40);

  const top = await prisma.boardItem.aggregate({
    where: { documentId: id },
    _max: { z: true },
  });
  let z = (top._max.z ?? 0) + 1;

  const created = [];
  for (const [index, file] of files.entries()) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return NextResponse.json(
        { error: `${file.name} is not an image we can show (${file.type || "unknown"}).` },
        { status: 400 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `${file.name} is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
        },
        { status: 400 },
      );
    }

    const [w = 240, h = 240, naturalW, naturalH] = (sizes[index] ?? "")
      .split(",")
      .map(Number);

    const stored = await putFile({
      bytes: new Uint8Array(await file.arrayBuffer()),
      mimeType: file.type,
      fileName: file.name || "image",
      width: Number.isFinite(naturalW) ? naturalW : null,
      height: Number.isFinite(naturalH) ? naturalH : null,
    });

    const item = await prisma.boardItem.create({
      data: {
        documentId: id,
        fileId: stored.id,
        // Stagger multiple drops so they do not land exactly on top of each other.
        x: clamp(dropX + index * 24, 0, BOARD_WIDTH - w),
        y: clamp(dropY + index * 24, 0, BOARD_HEIGHT - h),
        w,
        h,
        z: z++,
      },
      select: { id: true, fileId: true, x: true, y: true, w: true, h: true, z: true, caption: true },
    });
    created.push(item);
  }

  await prisma.document.update({ where: { id }, data: { updatedAt: new Date() } });
  return NextResponse.json({ items: created });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
