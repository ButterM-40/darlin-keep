import {
  PDFDocument,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFTextField,
  StandardFonts,
  type PDFFont,
} from "pdf-lib";

export type FieldValues = Record<string, string>;

/**
 * Appearance streams are generated with Helvetica, which encodes WinAnsi only.
 * Typographic characters are folded to their ASCII equivalents and anything
 * still outside the range is replaced, so a stray character can never fail a
 * whole sheet render. To support scripts beyond Latin-1, embed a Unicode TTF
 * with @pdf-lib/fontkit and pass it to updateFieldAppearances instead.
 */
const TYPOGRAPHIC: Array<[RegExp, string]> = [
  [/[‘’‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  [/[–—−]/g, "-"],
  [/…/g, "..."],
  [/ /g, " "],
];

function sanitize(value: string): string {
  let out = value;
  for (const [pattern, replacement] of TYPOGRAPHIC) {
    out = out.replace(pattern, replacement);
  }
  return Array.from(out)
    .map((ch) => (ch.codePointAt(0)! <= 0xff ? ch : "?"))
    .join("");
}

function applyValue(
  field: unknown,
  raw: string,
  onError: (message: string) => void,
): void {
  const value = sanitize(raw);
  try {
    if (field instanceof PDFTextField) {
      const max = field.getMaxLength();
      field.setText(
        typeof max === "number" && max > 0 ? value.slice(0, max) : value,
      );
      return;
    }
    if (field instanceof PDFCheckBox) {
      const on = value === "true" || value === "on" || value === "1";
      if (on) field.check();
      else field.uncheck();
      return;
    }
    if (field instanceof PDFRadioGroup || field instanceof PDFDropdown) {
      if (value) field.select(value);
      return;
    }
    if (field instanceof PDFOptionList) {
      if (value) field.select(value);
      return;
    }
  } catch (error) {
    onError(error instanceof Error ? error.message : String(error));
  }
}

export interface FillOptions {
  /** Flatten the form so the result cannot be edited in a PDF reader. */
  flatten?: boolean;
}

/** Writes a value map into a copy of the template and returns the PDF bytes. */
export async function fillTemplate(
  templateBytes: Uint8Array,
  values: FieldValues,
  options: FillOptions = {},
): Promise<Uint8Array> {
  const doc = await PDFDocument.load(templateBytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const font: PDFFont = await doc.embedFont(StandardFonts.Helvetica);

  for (const [name, raw] of Object.entries(values)) {
    if (raw === undefined || raw === null || raw === "") continue;
    let field;
    try {
      field = form.getField(name);
    } catch {
      // The template was revised and no longer has this field; skip it rather
      // than failing the whole render.
      continue;
    }
    applyValue(field, String(raw), () => {});
  }

  form.updateFieldAppearances(font);
  if (options.flatten) form.flatten();
  return doc.save();
}

/** Reads every field value out of a filled PDF. */
export async function readValues(bytes: Uint8Array): Promise<FieldValues> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const values: FieldValues = {};

  for (const field of doc.getForm().getFields()) {
    const name = field.getName();
    if (field instanceof PDFTextField) {
      const text = field.getText();
      if (text) values[name] = text;
    } else if (field instanceof PDFCheckBox) {
      if (field.isChecked()) values[name] = "true";
    } else if (field instanceof PDFRadioGroup || field instanceof PDFDropdown) {
      const selected = field.getSelected();
      const value = Array.isArray(selected) ? selected[0] : selected;
      if (value) values[name] = value;
    } else if (field instanceof PDFOptionList) {
      const [first] = field.getSelected();
      if (first) values[name] = first;
    }
  }

  return values;
}

/** Strips all values so a filled sheet can be reused as a blank template. */
export async function blankTemplate(bytes: Uint8Array): Promise<Uint8Array> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const form = doc.getForm();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  for (const field of form.getFields()) {
    try {
      if (field instanceof PDFTextField) field.setText("");
      else if (field instanceof PDFCheckBox) field.uncheck();
      else if (field instanceof PDFRadioGroup) field.clear();
      else if (field instanceof PDFDropdown || field instanceof PDFOptionList) {
        field.clear();
      }
    } catch {
      // A field that refuses to clear is left as-is.
    }
  }

  form.updateFieldAppearances(font);
  return doc.save();
}
