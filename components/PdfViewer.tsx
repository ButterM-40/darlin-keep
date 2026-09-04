"use client";

import { SheetSurface, type PageSize } from "@/components/SheetSurface";

/**
 * Read-only render of a filled sheet. It points at the flattened PDF on
 * purpose: flattening bakes the field values into the page content, so the
 * values still show even though annotations are not drawn.
 */
export function PdfViewer({
  pdfUrl,
  pageSizes,
}: {
  pdfUrl: string;
  pageSizes: PageSize[];
}) {
  return (
    <SheetSurface pdfUrl={pdfUrl} pageSizes={pageSizes} renderOverlay={() => null} />
  );
}
