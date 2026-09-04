import {
  PDFDocument,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  type PDFDict,
  type PDFPage,
} from "pdf-lib";

export type FieldType = "text" | "textarea" | "checkbox" | "radio" | "select";

export interface ScannedField {
  pdfName: string;
  /** A field may own several widgets (the same value drawn in several places). */
  widgetIndex: number;
  page: number;
  /** CSS-ready: top-left origin, in PDF points. */
  x: number;
  y: number;
  w: number;
  h: number;
  type: FieldType;
  options: string[] | null;
  maxLen: number | null;
  order: number;
}

export interface PageSize {
  width: number;
  height: number;
}

export interface ScanResult {
  pageCount: number;
  pageSizes: PageSize[];
  fields: ScannedField[];
}

/**
 * Maps every widget annotation dict to the index of the page it is drawn on.
 * pdf-lib caches lookups, so the resolved dict is reference-equal to the one
 * reachable from the field, which lets us match without comparing refs.
 */
function buildWidgetPageIndex(pages: PDFPage[]): Map<PDFDict, number> {
  const index = new Map<PDFDict, number>();
  pages.forEach((page, pageNumber) => {
    const annots = page.node.Annots();
    if (!annots) return;
    for (let i = 0; i < annots.size(); i++) {
      const resolved = page.node.context.lookup(annots.get(i));
      if (resolved) index.set(resolved as PDFDict, pageNumber);
    }
  });
  return index;
}

function classify(field: unknown): {
  type: FieldType;
  options: string[] | null;
  maxLen: number | null;
} {
  if (field instanceof PDFTextField) {
    return {
      type: field.isMultiline() ? "textarea" : "text",
      options: null,
      maxLen: field.getMaxLength() ?? null,
    };
  }
  if (field instanceof PDFCheckBox) {
    return { type: "checkbox", options: null, maxLen: null };
  }
  if (field instanceof PDFRadioGroup) {
    return { type: "radio", options: field.getOptions(), maxLen: null };
  }
  if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
    return { type: "select", options: field.getOptions(), maxLen: null };
  }
  return { type: "text", options: null, maxLen: null };
}

/**
 * Assigns tab order by grouping fields into horizontal bands, then reading
 * each band left to right. The band tolerance tracks the median field height
 * so it adapts to dense and sparse sheets alike.
 */
function assignOrder(fields: ScannedField[]): void {
  const heights = fields.map((f) => f.h).sort((a, b) => a - b);
  const median = heights.length ? heights[Math.floor(heights.length / 2)] : 12;
  const tolerance = Math.max(median * 0.5, 4);

  const sorted = [...fields].sort(
    (a, b) => a.page - b.page || a.y - b.y || a.x - b.x,
  );

  const bands: ScannedField[][] = [];
  for (const field of sorted) {
    const band = bands[bands.length - 1];
    const sameBand =
      band &&
      band[0].page === field.page &&
      Math.abs(band[0].y - field.y) <= tolerance;
    if (sameBand) band.push(field);
    else bands.push([field]);
  }

  let order = 0;
  for (const band of bands) {
    band.sort((a, b) => a.x - b.x);
    for (const field of band) field.order = order++;
  }
}

/** Reads every AcroForm widget out of a PDF, with page-relative CSS geometry. */
export async function scanTemplate(bytes: Uint8Array): Promise<ScanResult> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageSizes = pages.map((p) => ({
    width: p.getWidth(),
    height: p.getHeight(),
  }));
  const widgetPage = buildWidgetPageIndex(pages);

  const fields: ScannedField[] = [];
  for (const field of doc.getForm().getFields()) {
    const { type, options, maxLen } = classify(field);
    const pdfName = field.getName();

    field.acroField.getWidgets().forEach((widget, widgetIndex) => {
      const page = widgetPage.get(widget.dict) ?? 0;
      const height = pageSizes[page]?.height ?? 0;
      const rect = widget.getRectangle();
      fields.push({
        pdfName,
        widgetIndex,
        page,
        x: rect.x,
        // PDF measures y from the bottom of the page; CSS measures from the top.
        y: height - (rect.y + rect.height),
        w: rect.width,
        h: rect.height,
        type,
        options,
        maxLen,
        order: 0,
      });
    });
  }

  assignOrder(fields);
  return { pageCount: pages.length, pageSizes, fields };
}
