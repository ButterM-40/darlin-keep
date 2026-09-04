import type { DocKind } from "@/lib/generated/prisma/client";

export type { DocKind };

export const DOC_KINDS: DocKind[] = ["PDF", "LINK", "BOARD"];

export const KIND_LABELS: Record<DocKind, string> = {
  PDF: "PDF",
  LINK: "Link",
  BOARD: "Board",
};

export const KIND_BLURBS: Record<DocKind, string> = {
  PDF: "A handout, rules excerpt or map to read in the browser.",
  LINK: "A pointer to something hosted elsewhere.",
  BOARD: "A free-form wall of images you can arrange.",
};

export function isDocKind(value: string): value is DocKind {
  return value === "PDF" || value === "LINK" || value === "BOARD";
}

/** The logical canvas a board is arranged on, in board units. */
export const BOARD_WIDTH = 2400;
export const BOARD_HEIGHT = 1600;

/** Longest edge a newly dropped image is scaled to. */
export const BOARD_DEFAULT_MAX_EDGE = 320;

/**
 * Normalises a link so `roll20.net/x` still opens as a URL rather than being
 * treated as a relative path.
 */
export function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Self-hosted, so the only limit is what the box can hold. Raise or lower it
 * with MAX_UPLOAD_MB; the old 4 MB figure existed only because serverless
 * platforms cap a request body at 4.5 MB.
 */
export const MAX_UPLOAD_BYTES = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB ?? 50) * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
