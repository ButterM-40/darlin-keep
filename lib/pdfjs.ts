import * as pdfjsLib from "pdfjs-dist";

// Served as a static asset by scripts/copy-pdf-worker.mjs (wired to postinstall).
// Bundling the worker is the usual cause of a silently blank canvas.
pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

export { pdfjsLib };
export const { AnnotationMode } = pdfjsLib;
