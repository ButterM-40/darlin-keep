import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { prisma } from "@/lib/db";
import { MAX_UPLOAD_BYTES, formatBytes } from "@/lib/documents";

/**
 * File storage, kept behind this module on purpose.
 *
 * Bytes live on disk under UPLOAD_DIR and only metadata goes in the database,
 * so the database stays small no matter how many images get pinned to boards.
 * Everything else in the app refers to files by id and reads them through
 * `/api/files/[id]`, so swapping disk for S3 or R2 later means rewriting the
 * four functions below and nothing else.
 *
 * Rows written before this change still hold their bytes inline; getFile falls
 * back to those until scripts/migrate-files-to-disk.mts moves them.
 */

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "./uploads");

export interface StoredFileMeta {
  id: string;
  mimeType: string;
  size: number;
  fileName: string;
  width: number | null;
  height: number | null;
}

export interface PutFileInput {
  bytes: Uint8Array;
  mimeType: string;
  fileName: string;
  width?: number | null;
  height?: number | null;
}

/**
 * Fans files across 256 directories. A single flat folder with tens of
 * thousands of entries gets slow to list and unpleasant to back up.
 */
function keyFor(id: string): string {
  const shard = createHash("sha1").update(id).digest("hex").slice(0, 2);
  return `${shard}/${id}`;
}

/** Refuses to resolve outside UPLOAD_DIR, whatever the stored key says. */
function pathFor(storageKey: string): string {
  const full = resolve(UPLOAD_DIR, storageKey);
  if (full !== UPLOAD_DIR && !full.startsWith(UPLOAD_DIR + sep)) {
    throw new Error("Refusing to read outside the upload directory.");
  }
  return full;
}

export async function putFile(input: PutFileInput): Promise<StoredFileMeta> {
  if (input.bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error(
      `That file is ${formatBytes(input.bytes.byteLength)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
    );
  }

  // The row is created first so the id can name the file on disk.
  const row = await prisma.storedFile.create({
    data: {
      mimeType: input.mimeType,
      size: input.bytes.byteLength,
      fileName: input.fileName,
      width: input.width ?? null,
      height: input.height ?? null,
    },
    select: { id: true },
  });

  const storageKey = keyFor(row.id);
  const target = pathFor(storageKey);

  try {
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, input.bytes);
  } catch (error) {
    // Never leave a row pointing at a file that failed to land.
    await prisma.storedFile.delete({ where: { id: row.id } }).catch(() => {});
    throw error;
  }

  return prisma.storedFile.update({
    where: { id: row.id },
    data: { storageKey },
    select: {
      id: true,
      mimeType: true,
      size: true,
      fileName: true,
      width: true,
      height: true,
    },
  });
}

export async function getFile(
  id: string,
): Promise<{ bytes: Uint8Array; mimeType: string; fileName: string } | null> {
  const file = await prisma.storedFile.findUnique({
    where: { id },
    select: { storageKey: true, bytes: true, mimeType: true, fileName: true },
  });
  if (!file) return null;

  if (file.storageKey) {
    try {
      const bytes = await readFile(pathFor(file.storageKey));
      return {
        bytes: new Uint8Array(bytes),
        mimeType: file.mimeType,
        fileName: file.fileName,
      };
    } catch {
      // The row survived but the file did not; treat it as missing.
      return null;
    }
  }

  if (file.bytes) {
    return {
      bytes: new Uint8Array(file.bytes),
      mimeType: file.mimeType,
      fileName: file.fileName,
    };
  }
  return null;
}

/** Removes a file, and its bytes, only once nothing references it. */
export async function deleteFileIfOrphaned(id: string): Promise<void> {
  const [asDocument, asBoardItem] = await Promise.all([
    prisma.document.count({ where: { fileId: id } }),
    prisma.boardItem.count({ where: { fileId: id } }),
  ]);
  if (asDocument > 0 || asBoardItem > 0) return;

  const file = await prisma.storedFile.findUnique({
    where: { id },
    select: { storageKey: true },
  });
  if (!file) return;

  await prisma.storedFile.delete({ where: { id } }).catch(() => {});
  if (file.storageKey) {
    await rm(pathFor(file.storageKey), { force: true }).catch(() => {});
  }
}

export { UPLOAD_DIR };
