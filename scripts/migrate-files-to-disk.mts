import "dotenv/config";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client.js";

/**
 * Moves file bytes out of the database and onto disk. Safe to re-run: rows
 * already carrying a storageKey are skipped, and a row's bytes are only
 * cleared once the file is on disk.
 */

const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? "./uploads");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3 }),
});

const pending = await prisma.storedFile.findMany({
  where: { storageKey: null },
  select: { id: true, size: true, fileName: true },
});

if (pending.length === 0) {
  console.log("Nothing to move — every file is already on disk.");
} else {
  console.log(`Moving ${pending.length} file(s) to ${UPLOAD_DIR}`);
}

let moved = 0;
let bytesMoved = 0;

for (const row of pending) {
  // Fetched one at a time so a big library does not land in memory at once.
  const full = await prisma.storedFile.findUnique({
    where: { id: row.id },
    select: { bytes: true },
  });
  if (!full?.bytes) {
    console.log(`  skip ${row.id} — no bytes stored`);
    continue;
  }

  const shard = createHash("sha1").update(row.id).digest("hex").slice(0, 2);
  const storageKey = `${shard}/${row.id}`;
  const target = resolve(UPLOAD_DIR, storageKey);

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, full.bytes);

  await prisma.storedFile.update({
    where: { id: row.id },
    data: { storageKey, bytes: null },
  });

  moved++;
  bytesMoved += row.size;
  console.log(`  moved ${row.fileName} (${(row.size / 1024).toFixed(0)} KB)`);
}

if (moved > 0) {
  console.log(
    `\nMoved ${moved} file(s), ${(bytesMoved / (1024 * 1024)).toFixed(1)} MB freed from the database.`,
  );
  console.log("Run VACUUM FULL on the database to actually reclaim the space.");
}

await prisma.$disconnect();
