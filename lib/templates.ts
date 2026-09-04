import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { blankTemplate } from "@/lib/pdf/fillTemplate";
import { scanTemplate } from "@/lib/pdf/scanTemplate";

export interface CreateTemplateInput {
  name: string;
  bytes: Uint8Array;
  /** Strip any values first, so a filled sheet can seed a blank template. */
  blank: boolean;
}

export async function createTemplate({
  name,
  bytes,
  blank,
}: CreateTemplateInput) {
  const pdfBytes = blank ? await blankTemplate(bytes) : bytes;
  const scan = await scanTemplate(pdfBytes);

  if (scan.fields.length === 0) {
    throw new Error(
      "That PDF has no fillable form fields, so there is nothing to edit. It needs to be a fillable PDF (an AcroForm).",
    );
  }

  return prisma.template.create({
    data: {
      name,
      pdf: Buffer.from(pdfBytes),
      pageCount: scan.pageCount,
      pageSizes: scan.pageSizes as unknown as Prisma.InputJsonValue,
      fields: {
        create: scan.fields.map((f) => ({
          pdfName: f.pdfName,
          widgetIndex: f.widgetIndex,
          page: f.page,
          x: f.x,
          y: f.y,
          w: f.w,
          h: f.h,
          type: f.type,
          options: f.options ?? undefined,
          maxLen: f.maxLen,
          order: f.order,
        })),
      },
    },
    include: { _count: { select: { fields: true } } },
  });
}

/** Geometry the editor needs, in tab order. */
export async function getTemplateWithFields(id: string) {
  return prisma.template.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      pageCount: true,
      pageSizes: true,
      fields: { orderBy: { order: "asc" } },
    },
  });
}
