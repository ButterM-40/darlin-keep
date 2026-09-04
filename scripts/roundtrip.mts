import { readFileSync, writeFileSync } from "node:fs";
import { blankTemplate, fillTemplate, readValues } from "../lib/pdf/fillTemplate.js";
import { scanTemplate } from "../lib/pdf/scanTemplate.js";
import { join } from "node:path";

const OUT_DIR = process.env.OUT_DIR ?? ".";
const outPath = (name: string) => join(OUT_DIR, name);

const src = new Uint8Array(readFileSync("Bruceus Wayner.pdf"));

const original = await readValues(src);
console.log("1. read original       ->", Object.keys(original).length, "values");

const blank = await blankTemplate(src);
const afterBlank = await readValues(blank);
console.log("2. blanked template    ->", Object.keys(afterBlank).length, "values remain");

const scan = await scanTemplate(blank);
console.log("3. scanned blank       ->", scan.fields.length, "fields,",
  scan.fields.filter((f) => f.type === "textarea").length, "textarea, page",
  scan.pageSizes[0].width.toFixed(2), "x", scan.pageSizes[0].height.toFixed(2));

const refilled = await fillTemplate(blank, original);
const roundTripped = await readValues(refilled);
console.log("4. refilled            ->", Object.keys(roundTripped).length, "values");

const keys = new Set([...Object.keys(original), ...Object.keys(roundTripped)]);
const diffs = [...keys].filter((k) => (original[k] ?? "") !== (roundTripped[k] ?? ""));
console.log("5. value differences   ->", diffs.length);
for (const k of diffs) {
  console.log(`     ${k}: ${JSON.stringify(original[k])} -> ${JSON.stringify(roundTripped[k])}`);
}

const flat = await fillTemplate(blank, original, { flatten: true });
const afterFlatten = await readValues(flat);
console.log("6. flattened           ->", Object.keys(afterFlatten).length, "editable fields (expect 0)");

writeFileSync(outPath("roundtrip.pdf"), refilled);
writeFileSync(outPath("blank.pdf"), blank);
console.log("\nwrote roundtrip.pdf and blank.pdf to ${OUT_DIR}");
console.log("sample:", JSON.stringify(roundTripped["text_1gu"]), JSON.stringify(roundTripped["textarea_139psg"]));
