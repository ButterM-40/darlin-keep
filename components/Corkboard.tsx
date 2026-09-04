"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  BOARD_DEFAULT_MAX_EDGE,
  BOARD_HEIGHT,
  BOARD_WIDTH,
} from "@/lib/documents";

export interface BoardItemView {
  id: string;
  fileId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  caption: string | null;
}

type Gesture =
  | { kind: "move"; id: string; grabX: number; grabY: number }
  | { kind: "resize"; id: string; startW: number; startH: number; startX: number; startY: number };

const MIN_SIZE = 48;

/**
 * A free-form wall of images. Positions are held in board units and the whole
 * surface is scaled to fit the window, so a board looks the same on any screen
 * and nothing needs re-arranging after a resize.
 */
export function Corkboard({
  documentId,
  initialItems,
}: {
  documentId: string;
  initialItems: BoardItemView[];
}) {
  const [items, setItems] = useState(initialItems);
  const [selected, setSelected] = useState<string | null>(null);
  const [scale, setScale] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  /**
   * React can batch a whole drag without re-rendering, which leaves event
   * handlers closing over the pre-drag array. Every update writes through this
   * ref so the end of a gesture always saves where the image actually landed.
   */
  const latest = useRef(items);
  const updateItems = useCallback(
    (updater: (current: BoardItemView[]) => BoardItemView[]) => {
      setItems((current) => {
        const next = updater(current);
        latest.current = next;
        return next;
      });
    },
    [],
  );

  useLayoutEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / BOARD_WIDTH);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /** Debounced per item, so dragging does not fire a request per frame. */
  const persist = useCallback(
    (item: BoardItemView) => {
      const timers = pending.current;
      const existing = timers.get(item.id);
      if (existing) clearTimeout(existing);
      timers.set(
        item.id,
        setTimeout(() => {
          timers.delete(item.id);
          void fetch(`/api/documents/${documentId}/items/${item.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ x: item.x, y: item.y, w: item.w, h: item.h, z: item.z }),
          });
        }, 400),
      );
    },
    [documentId],
  );

  const toBoard = useCallback(
    (clientX: number, clientY: number) => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect || !scale) return { x: 0, y: 0 };
      return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
    },
    [scale],
  );

  function nextZ(): number {
    return latest.current.reduce((max, i) => Math.max(max, i.z), 0) + 1;
  }

  function startMove(event: ReactPointerEvent, item: BoardItemView) {
    event.preventDefault();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    const point = toBoard(event.clientX, event.clientY);
    gesture.current = {
      kind: "move",
      id: item.id,
      grabX: point.x - item.x,
      grabY: point.y - item.y,
    };
    const z = nextZ();
    setSelected(item.id);
    updateItems((current) => current.map((i) => (i.id === item.id ? { ...i, z } : i)));
  }

  function startResize(event: ReactPointerEvent, item: BoardItemView) {
    event.preventDefault();
    event.stopPropagation();
    (event.target as Element).setPointerCapture?.(event.pointerId);
    const point = toBoard(event.clientX, event.clientY);
    gesture.current = {
      kind: "resize",
      id: item.id,
      startW: item.w,
      startH: item.h,
      startX: point.x,
      startY: point.y,
    };
    setSelected(item.id);
  }

  function onPointerMove(event: ReactPointerEvent) {
    const active = gesture.current;
    if (!active) return;
    const point = toBoard(event.clientX, event.clientY);

    updateItems((current) =>
      current.map((item) => {
        if (item.id !== active.id) return item;
        if (active.kind === "move") {
          return {
            ...item,
            x: clamp(point.x - active.grabX, 0, BOARD_WIDTH - item.w),
            y: clamp(point.y - active.grabY, 0, BOARD_HEIGHT - item.h),
          };
        }
        // Resize from the bottom-right corner, keeping the original aspect ratio.
        const ratio = active.startH / active.startW;
        const width = clamp(
          active.startW + (point.x - active.startX),
          MIN_SIZE,
          BOARD_WIDTH - item.x,
        );
        return { ...item, w: width, h: clamp(width * ratio, MIN_SIZE, BOARD_HEIGHT - item.y) };
      }),
    );
  }

  function endGesture() {
    const active = gesture.current;
    gesture.current = null;
    if (!active) return;
    const item = latest.current.find((i) => i.id === active.id);
    if (item) persist(item);
  }

  // Persist whatever is still pending if the tab closes mid-drag.
  useEffect(() => {
    const timers = pending.current;
    return () => {
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, []);

  const upload = useCallback(
    async (files: File[], at: { x: number; y: number }) => {
      const images = files.filter((f) => f.type.startsWith("image/"));
      if (images.length === 0) return;

      setBusy(true);
      setError(null);
      try {
        const form = new FormData();
        form.set("x", String(Math.round(at.x)));
        form.set("y", String(Math.round(at.y)));

        for (const file of images) {
          form.append("images", file);
          // Measured here so the server needs no image-decoding dependency.
          const size = await measure(file);
          form.append("sizes", size.join(","));
        }

        const response = await fetch(`/api/documents/${documentId}/items`, {
          method: "POST",
          body: form,
        });
        const body = (await response.json()) as { items?: BoardItemView[]; error?: string };
        if (!response.ok || !body.items) {
          setError(body.error ?? "Those images could not be added.");
          return;
        }
        updateItems((current) => [...current, ...body.items!]);
      } catch {
        setError("Those images could not be added.");
      } finally {
        setBusy(false);
      }
    },
    [documentId, updateItems],
  );

  async function remove(id: string) {
    updateItems((current) => current.filter((i) => i.id !== id));
    setSelected(null);
    await fetch(`/api/documents/${documentId}/items/${id}`, { method: "DELETE" });
  }

  // Delete key removes the selected image.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!selected) return;
      const tag = (event.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        void remove(selected);
      }
      if (event.key === "Escape") setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-ink-600/70 bg-ink-800/70 px-4 py-2.5 text-sm">
        <label className="cursor-pointer rounded-md border border-ink-500 px-3 py-1.5 text-parchment hover:border-ember">
          Add images
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              void upload(files, { x: 60, y: 60 });
            }}
          />
        </label>

        <span className="text-parchment-dim">
          {items.length} image{items.length === 1 ? "" : "s"}
        </span>
        {busy ? <span className="text-gold">Uploading…</span> : null}
        {error ? <span className="text-blood">{error}</span> : null}

        {selected ? (
          <button
            type="button"
            onClick={() => void remove(selected)}
            className="rounded-md border border-ink-500 px-2.5 py-1 text-xs text-parchment-dim hover:border-blood hover:text-blood"
          >
            Remove selected
          </button>
        ) : null}

        <span className="ml-auto text-xs text-parchment-dim/60">
          Drag to move · corner to resize · drop images anywhere
        </span>
      </div>

      <div
        ref={frameRef}
        className={
          dropping
            ? "relative w-full overflow-hidden rounded-xl outline-2 outline-dashed outline-ember"
            : "relative w-full overflow-hidden rounded-xl outline-2 outline-dashed outline-transparent"
        }
        style={{ height: scale ? BOARD_HEIGHT * scale : 400 }}
        onDragOver={(event) => {
          event.preventDefault();
          setDropping(true);
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropping(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDropping(false);
          const at = toBoard(event.clientX, event.clientY);
          void upload([...event.dataTransfer.files], at);
        }}
        onPointerMove={onPointerMove}
        onPointerUp={endGesture}
        onPointerCancel={endGesture}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
      >
        {/* Corkboard surface, drawn once and scaled with the items. */}
        <div
          className="absolute left-0 top-0 origin-top-left bg-[#2a2118] bg-[radial-gradient(circle_at_1px_1px,rgba(217,180,91,0.10)_1px,transparent_0)] bg-[size:22px_22px] ring-1 ring-ink-500/60"
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `scale(${scale || 1})`,
          }}
        >
          {items.length === 0 ? (
            <p className="absolute inset-0 flex items-center justify-center text-2xl text-parchment-dim/40">
              Drop images here, or use Add images.
            </p>
          ) : null}

          {items.map((item) => (
            <div
              key={item.id}
              onPointerDown={(event) => startMove(event, item)}
              className={
                selected === item.id
                  ? "absolute cursor-grab touch-none rounded-sm bg-white p-1.5 shadow-lg shadow-black/50 outline-2 outline-ember active:cursor-grabbing"
                  : "absolute cursor-grab touch-none rounded-sm bg-white p-1.5 shadow-lg shadow-black/50 active:cursor-grabbing"
              }
              style={{ left: item.x, top: item.y, width: item.w, height: item.h, zIndex: item.z }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/files/${item.fileId}`}
                alt={item.caption ?? ""}
                draggable={false}
                className="pointer-events-none h-full w-full select-none object-cover"
              />
              <span
                onPointerDown={(event) => startResize(event, item)}
                className="absolute -bottom-1 -right-1 size-5 cursor-nwse-resize touch-none rounded-full border-2 border-ink-900 bg-ember opacity-0 transition group-hover:opacity-100"
                style={{ opacity: selected === item.id ? 1 : undefined }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** Returns [displayWidth, displayHeight, naturalWidth, naturalHeight]. */
async function measure(file: File): Promise<[number, number, number, number]> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    bitmap.close?.();
    const longest = Math.max(width, height);
    const factor = longest > BOARD_DEFAULT_MAX_EDGE ? BOARD_DEFAULT_MAX_EDGE / longest : 1;
    return [Math.round(width * factor), Math.round(height * factor), width, height];
  } catch {
    return [240, 240, 240, 240];
  }
}
