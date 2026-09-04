import { readFileSync } from "node:fs";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { scanTemplate } from "../lib/pdf/scanTemplate";

const path = process.argv[2] ?? "Bruceus Wayner.pdf";
const bytes = new Uint8Array(readFileSync(path));

const result = await scanTemplate(bytes);
const byType = result.fields.reduce<Record<string, number>>((acc, f) => {
  acc[f.type] = (acc[f.type] ?? 0) + 1;
  return acc;
}, {});

console.log("file:      ", path);
console.log("pages:     ", result.pageCount, result.pageSizes);
console.log("fields:    ", result.fields.length);
console.log("by type:   ", byType);

const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
const filled = doc
  .getForm()
  .getFields()
  .filter((f): f is PDFTextField => f instanceof PDFTextField)
  .map((f) => [f.getName(), f.getText()] as const)
  .filter(([, v]) => v);
console.log("filled:    ", filled.length);
for (const [name, value] of filled) {
  console.log(`   ${name.padEnd(18)} ${JSON.stringify(value)}`);
}

console.log("\nfirst 12 fields in tab order (x/y are CSS, top-left origin):");
for (const f of result.fields.slice().sort((a, b) => a.order - b.order).slice(0, 12)) {
  const g = `x=${f.x.toFixed(0)} y=${f.y.toFixed(0)} ${f.w.toFixed(0)}x${f.h.toFixed(0)}`;
  console.log(`   #${String(f.order).padStart(3)} ${f.pdfName.padEnd(18)} ${f.type.padEnd(8)} ${g}`);
}

const multiline = result.fields.filter((f) => f.type === "textarea");
console.log("\nmultiline fields:", multiline.map((f) => f.pdfName).join(", "));
