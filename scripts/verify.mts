import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.js";
import { readValues } from "../lib/pdf/fillTemplate.js";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHEET = "Bruceus Wayner.pdf";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const pdfBytes = readFileSync(SHEET);
const file = new File([new Uint8Array(pdfBytes)], SHEET, { type: "application/pdf" });

// 1. Upload as a blank template ------------------------------------------------
console.log("\n1. Upload the sheet as a blank template");
const upload = new FormData();
upload.set("pdf", file);
upload.set("name", "Grimdark Sheet v1");
upload.set("blank", "true");

const uploadRes = await fetch(`${BASE}/api/templates`, { method: "POST", body: upload });
const uploaded = (await uploadRes.json()) as { id: string; fieldCount: number; error?: string };
check("upload accepted", uploadRes.ok, uploaded.error ?? `HTTP ${uploadRes.status}`);
check("141 fields detected", uploaded.fieldCount === 141, `got ${uploaded.fieldCount}`);

const templateId = uploaded.id;
const template = await prisma.template.findUniqueOrThrow({
  where: { id: templateId },
  include: { fields: true },
});
const sizes = template.pageSizes as unknown as Array<{ width: number; height: number }>;
check("single A4 page", template.pageCount === 1 && Math.round(sizes[0].width) === 595,
  `${template.pageCount} page(s), ${sizes[0].width.toFixed(2)}x${sizes[0].height.toFixed(2)}`);
check("4 multiline fields",
  template.fields.filter((f) => f.type === "textarea").length === 4);
check("stored template is blank",
  Object.keys(await readValues(new Uint8Array(template.pdf))).length === 0);

// Geometry is what makes the overlay line up, so assert a known row.
const abilityRow = template.fields
  .filter((f) => Math.round(f.h) === 28 && Math.round(f.w) === 28)
  .sort((a, b) => a.y - b.y || a.x - b.x);
check("ability boxes found", abilityRow.length >= 6, `${abilityRow.length} boxes of 28x28`);
check("first ability row at expected x positions",
  abilityRow.slice(0, 6).map((f) => Math.round(f.x)).join(",") === "47,78,111,143,175,207",
  abilityRow.slice(0, 6).map((f) => Math.round(f.x)).join(","));

// 2. Label the roster fields ---------------------------------------------------
console.log("\n2. Assign roster roles");
const idOf = (pdfName: string) =>
  template.fields.find((f) => f.pdfName === pdfName)!.id;
const rolesRes = await fetch(`${BASE}/api/templates/${templateId}/roles`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    roles: {
      displayName: idOf("text_1gu"),
      classLevel: idOf("text_2qmtm"),
      species: idOf("text_3jpkj"),
      hp: idOf("text_4pov"),
    },
  }),
});
check("roles saved", rolesRes.ok, `HTTP ${rolesRes.status}`);
check("four roles persisted",
  (await prisma.templateField.count({ where: { templateId, role: { not: null } } })) === 4);

// 3. Import the filled sheet as a character ------------------------------------
console.log("\n3. Import the filled PDF as a character");
const owner = await prisma.owner.findFirstOrThrow({ where: { name: "Ramiro" } });
const importForm = new FormData();
importForm.set("pdf", file);
importForm.set("ownerId", owner.id);
importForm.set("status", "ACTIVE_PARTY");

const importRes = await fetch(`${BASE}/api/templates/${templateId}/import`, {
  method: "POST",
  body: importForm,
});
const imported = (await importRes.json()) as {
  id: string; displayName: string; imported: number; skipped: number; error?: string;
};
check("import accepted", importRes.ok, imported.error ?? `HTTP ${importRes.status}`);
check("24 values imported", imported.imported === 24, `got ${imported.imported}`);
check("no fields skipped", imported.skipped === 0, `${imported.skipped} skipped`);
check("name read from the sheet", imported.displayName === "Bruceus Wanyer", imported.displayName);

const character = await prisma.character.findUniqueOrThrow({ where: { id: imported.id } });
const summary = character.summary as Record<string, string>;
check("roster summary derived",
  summary.species === "Human" && summary.classLevel === "Smith Lv. 1" && summary.hp === "0/10",
  JSON.stringify(summary));
const membership = await prisma.campaignMember.findFirst({ where: { characterId: character.id } });
check("landed in Active Party", membership?.status === "ACTIVE_PARTY");

// 4. Edit through the API ------------------------------------------------------
console.log("\n4. Save an edit the way the editor does");
const values = { ...(character.values as Record<string, string>), text_1gu: "Bruceus Wayner" };
const patchRes = await fetch(`${BASE}/api/characters/${imported.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ values, baseUpdatedAt: character.updatedAt.toISOString() }),
});
const patched = (await patchRes.json()) as { displayName: string; updatedAt: string };
check("edit saved", patchRes.ok, `HTTP ${patchRes.status}`);
check("roster name updated with the edit", patched.displayName === "Bruceus Wayner",
  patched.displayName);

console.log("\n5. Reject a stale write");
const staleRes = await fetch(`${BASE}/api/characters/${imported.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ values, baseUpdatedAt: "2020-01-01T00:00:00.000Z" }),
});
check("concurrent edit refused with 409", staleRes.status === 409, `HTTP ${staleRes.status}`);

// 6. Render the PDF back out ---------------------------------------------------
console.log("\n6. Render the character back to a real PDF");
const pdfRes = await fetch(`${BASE}/api/characters/${imported.id}/pdf`);
const rendered = new Uint8Array(await pdfRes.arrayBuffer());
check("pdf served", pdfRes.ok && pdfRes.headers.get("content-type") === "application/pdf");
const back = await readValues(rendered);
check("all 24 values present in the PDF", Object.keys(back).length === 24,
  `${Object.keys(back).length} values`);
check("edit is in the PDF", back["text_1gu"] === "Bruceus Wayner", back["text_1gu"]);
check("notes textarea survived round trip",
  back["textarea_139psg"] === "Corundum\nSilver\n", JSON.stringify(back["textarea_139psg"]));

const flatRes = await fetch(`${BASE}/api/characters/${imported.id}/pdf?flatten=1`);
const flat = new Uint8Array(await flatRes.arrayBuffer());
check("flattened pdf has no editable fields",
  Object.keys(await readValues(flat)).length === 0);
check("flattened pdf is a real pdf", new TextDecoder().decode(flat.slice(0, 5)) === "%PDF-");

// 7. Pages render --------------------------------------------------------------
console.log("\n7. Pages render");
for (const [label, path] of [
  ["roster", "/"],
  ["editor", `/characters/${imported.id}`],
  ["full sheet", `/characters/${imported.id}/sheet`],
  ["sheets", "/templates"],
  ["label fields", `/templates/${templateId}/roles`],
  ["players", "/owners"],
  ["new character", "/characters/new"],
] as const) {
  const res = await fetch(`${BASE}${path}`);
  const html = await res.text();
  check(`${label} (${path})`, res.ok, `HTTP ${res.status}`);
  if (path === "/") {
    check("  roster shows the character", html.includes("Bruceus Wayner"));
    check("  roster shows Active Party row", html.includes("Active Party"));
    check("  roster shows owner label", html.includes("Ramiro"));
  }
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 1);
