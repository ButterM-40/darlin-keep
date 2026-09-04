"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnnotationMode, pdfjsLib } from "@/lib/pdfjs";

export interface PageSize {
  width: number;
  height: number;
}

/** Rendered once at this multiple of PDF points, then scaled down with CSS. */
const RENDER_SCALE = 2.5;

interface SheetSurfaceProps {
  pdfUrl: string;
  pageSizes: PageSize[];
  /** Overlay content for a page, positioned in raw PDF points. */
  renderOverlay: (pageIndex: number, size: PageSize) => ReactNode;
}

/**
 * Draws each page of the sheet to a canvas and lays an overlay on top that uses
 * the PDF's own coordinate system. The overlay is scaled as a single unit, so
 * positions, sizes and font sizes all stay in proportion at any width.
 */
export function SheetSurface({ pdfUrl, pageSizes, renderOverlay }: SheetSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Array<HTMLCanvasElement | null>>([]);
  const [scale, setScale] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const pageWidth = pageSizes[0]?.width ?? 595;

  // Track the available width so the sheet always fits its column.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / pageWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [pageWidth]);

  useEffect(() => {
    let cancelled = false;
    const tasks: Array<{ cancel: () => void }> = [];

    (async () => {
      try {
        const doc = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
        if (cancelled) return;

        for (let i = 0; i < doc.numPages; i++) {
          const page = await doc.getPage(i + 1);
          const canvas = canvasRefs.current[i];
          if (cancelled || !canvas) continue;

          const viewport = page.getViewport({ scale: RENDER_SCALE });
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          const canvasContext = canvas.getContext("2d");
          if (!canvasContext) continue;

          const task = page.render({
            canvas,
            canvasContext,
            viewport,
            // Without this the blank form boxes are painted underneath our own
            // inputs, doubling every border on the page.
            annotationMode: AnnotationMode.DISABLE,
          });
          tasks.push(task);
          await task.promise;
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Could not render the sheet.");
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const task of tasks) task.cancel();
    };
  }, [pdfUrl]);

  return (
    <div ref={containerRef} className="w-full">
      {error && (
        <p className="rounded-md border border-blood/50 bg-blood/10 p-3 text-sm text-parchment">
          {error}
        </p>
      )}
      {pageSizes.map((size, index) => (
        <div
          key={index}
          className="relative mb-6 overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/50 ring-1 ring-ink-500/60"
          style={{ height: scale ? size.height * scale : undefined }}
        >
          <canvas
            ref={(el) => {
              canvasRefs.current[index] = el;
            }}
            className="absolute inset-0 h-full w-full"
          />
          {scale > 0 && (
            <div
              className="absolute left-0 top-0 origin-top-left"
              style={{
                width: size.width,
                height: size.height,
                transform: `scale(${scale})`,
              }}
            >
              {renderOverlay(index, size)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
