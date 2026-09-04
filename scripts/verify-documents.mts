import "dotenv/config";
import { readFileSync } from "node:fs";
import { crc32, deflateSync } from "node:zlib";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.js";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3 }),
});

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  PASS" : "  FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

/** A tiny valid PNG, built by hand so the test needs no fixture file. */
function png(width: number, height: number): Buffer {
  function chunk(type: string, data: Buffer): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  const raw = Buffer.concat(
    Array.from({ length: height }, () =>
      Buffer.concat([Buffer.from([0]), Buffer.alloc(width * 3, 0x80)]),
    ),
  );
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

console.log("\n1. Link document");
const linkForm = new FormData();
linkForm.set("kind", "LINK");
linkForm.set("title", "Roll20 campaign");
linkForm.set("url", "roll20.net/campaigns/details/123");
const linkRes = await fetch(`${BASE}/api/documents`, { method: "POST", body: linkForm });
const link = (await linkRes.json()) as { id?: string; error?: string };
check("created", linkRes.ok, link.error ?? "");
const linkDoc = link.id
  ? await prisma.document.findUnique({ where: { id: link.id } })
  : null;
check("scheme added to bare host", linkDoc?.url === "https://roll20.net/campaigns/details/123",
  linkDoc?.url ?? "");

const badForm = new FormData();
badForm.set("kind", "LINK");
badForm.set("title", "Nope");
badForm.set("url", "javascript:alert(1)");
const badRes = await fetch(`${BASE}/api/documents`, { method: "POST", body: badForm });
check("javascript: url rejected", badRes.status === 400, `HTTP ${badRes.status}`);

console.log("\n2. PDF document");
const pdfBytes = readFileSync("Bruceus Wayner.pdf");
const pdfForm = new FormData();
pdfForm.set("kind", "PDF");
pdfForm.set("title", "Blank sheet handout");
pdfForm.set("note", "Print this for new players.");
pdfForm.set("pdf", new File([new Uint8Array(pdfBytes)], "sheet.pdf", { type: "application/pdf" }));
const pdfRes = await fetch(`${BASE}/api/documents`, { method: "POST", body: pdfForm });
const pdfDoc = (await pdfRes.json()) as { id?: string; error?: string };
check("created", pdfRes.ok, pdfDoc.error ?? "");
const storedPdf = pdfDoc.id
  ? await prisma.document.findUnique({ where: { id: pdfDoc.id } })
  : null;
check("page count read at upload", storedPdf?.pageCount === 1, String(storedPdf?.pageCount));
const fileRes = await fetch(`${BASE}/api/files/${storedPdf?.fileId}`);
const served = new Uint8Array(await fileRes.arrayBuffer());
check("bytes served back intact",
  served.byteLength === pdfBytes.byteLength &&
    fileRes.headers.get("content-type") === "application/pdf",
  `${served.byteLength} vs ${pdfBytes.byteLength}`);

console.log("\n3. Board document");
const boardForm = new FormData();
boardForm.set("kind", "BOARD");
boardForm.set("title", "Ravenmoor inspiration");
const boardRes = await fetch(`${BASE}/api/documents`, { method: "POST", body: boardForm });
const board = (await boardRes.json()) as { id?: string; error?: string };
check("created", boardRes.ok, board.error ?? "");
const boardId = board.id!;

const images = new FormData();
images.append("images", new File([new Uint8Array(png(64, 48))], "map.png", { type: "image/png" }));
images.append("sizes", "320,240,640,480");
images.append("images", new File([new Uint8Array(png(32, 32))], "npc.png", { type: "image/png" }));
images.append("sizes", "200,200,400,400");
images.set("x", "100");
images.set("y", "80");
const addRes = await fetch(`${BASE}/api/documents/${boardId}/items`, {
  method: "POST",
  body: images,
});
const added = (await addRes.json()) as { items?: Array<{ id: string; x: number; y: number; z: number }>; error?: string };
check("two images pinned", addRes.ok && added.items?.length === 2, added.error ?? "");
check("drops are staggered, not stacked",
  added.items![0].x !== added.items![1].x && added.items![0].z < added.items![1].z,
  JSON.stringify(added.items!.map((i) => [i.x, i.z])));

const nonImage = new FormData();
nonImage.append("images", new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" }));
nonImage.append("sizes", "10,10,10,10");
const rejectRes = await fetch(`${BASE}/api/documents/${boardId}/items`, {
  method: "POST",
  body: nonImage,
});
check("non-image rejected", rejectRes.status === 400, `HTTP ${rejectRes.status}`);

console.log("\n4. Moving an image persists");
const first = added.items![0];
const patchRes = await fetch(`${BASE}/api/documents/${boardId}/items/${first.id}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ x: 900, y: 640, w: 410, h: 300, z: 7 }),
});
check("position saved", patchRes.ok, `HTTP ${patchRes.status}`);
const moved = await prisma.boardItem.findUniqueOrThrow({ where: { id: first.id } });
check("read back at new position",
  moved.x === 900 && moved.y === 640 && moved.w === 410 && moved.z === 7,
  `${moved.x},${moved.y} ${moved.w}x${moved.h} z${moved.z}`);

console.log("\n5. Deleting an image reclaims its bytes");
const filesBefore = await prisma.storedFile.count();
const second = added.items![1];
const item = await prisma.boardItem.findUniqueOrThrow({ where: { id: second.id } });
const delRes = await fetch(`${BASE}/api/documents/${boardId}/items/${second.id}`, {
  method: "DELETE",
});
check("item deleted", delRes.ok, `HTTP ${delRes.status}`);
check("orphaned file removed too",
  (await prisma.storedFile.count()) === filesBefore - 1 &&
    (await prisma.storedFile.findUnique({ where: { id: item.fileId } })) === null);

console.log("\n6. Pages render");
for (const [label, path] of [
  ["documents", "/documents"],
  ["add document", "/documents/new"],
  ["link view", `/documents/${link.id}`],
  ["pdf view", `/documents/${pdfDoc.id}`],
  ["board view", `/documents/${boardId}`],
] as const) {
  const res = await fetch(`${BASE}${path}`);
  const html = await res.text();
  check(`${label} (${path})`, res.ok, `HTTP ${res.status}`);
  if (path === "/documents") {
    check("  lists all three kinds",
      html.includes("Roll20 campaign") &&
        html.includes("Blank sheet handout") &&
        html.includes("Ravenmoor inspiration"));
  }
}

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
await prisma.$disconnect();
process.exit(failures === 0 ? 0 : 1);
