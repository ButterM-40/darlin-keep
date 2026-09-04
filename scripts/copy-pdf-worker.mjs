// The pdf.js worker must be served as a static asset; bundling it is fragile.
// Copying it into public/ keeps workerSrc a plain, predictable URL.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkg = dirname(require.resolve("pdfjs-dist/package.json"));
const src = join(pkg, "build", "pdf.worker.min.mjs");
const destDir = join(process.cwd(), "public", "pdfjs");

mkdirSync(destDir, { recursive: true });
copyFileSync(src, join(destDir, "pdf.worker.min.mjs"));
console.log("copied pdf.js worker -> public/pdfjs/pdf.worker.min.mjs");
