"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SheetSurface, type PageSize } from "@/components/SheetSurface";

export interface EditorField {
  id: string;
  pdfName: string;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  options: string[] | null;
  maxLen: number | null;
  order: number;
  role: string | null;
}

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "stale";

const SAVE_DEBOUNCE_MS = 800;

/** Small square cells (ability scores and the like) read better centred. */
function alignmentFor(field: EditorField): "center" | "left" {
  return field.w <= 34 && field.type !== "textarea" ? "center" : "left";
}

function fontSizeFor(field: EditorField): number {
  if (field.type === "textarea") return 8.5;
  return Math.min(field.h * 0.72, 20);
}

export function SheetEditor({
  characterId,
  pdfUrl,
  pageSizes,
  fields,
  initialValues,
  initialUpdatedAt,
}: {
  characterId: string;
  pdfUrl: string;
  pageSizes: PageSize[];
  fields: EditorField[];
  initialValues: Record<string, string>;
  initialUpdatedAt: string;
}) {
  const [values, setValues] = useState(initialValues);
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const baseUpdatedAt = useRef(initialUpdatedAt);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The debounced save fires outside render, so it reads the newest values here
  // rather than capturing a stale closure.
  const latest = useRef(values);
  useEffect(() => {
    latest.current = values;
  }, [values]);

  const byPage = useMemo(() => {
    const map = new Map<number, EditorField[]>();
    for (const field of fields) {
      const list = map.get(field.page) ?? [];
      list.push(field);
      map.set(field.page, list);
    }
    return map;
  }, [fields]);

  const save = useCallback(async () => {
    setState("saving");
    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          values: latest.current,
          baseUpdatedAt: baseUpdatedAt.current,
        }),
      });

      if (response.status === 409) {
        const body = (await response.json()) as { message?: string };
        setState("stale");
        setMessage(body.message ?? "This character changed elsewhere.");
        return;
      }
      if (!response.ok) throw new Error(`Save failed (${response.status})`);

      const body = (await response.json()) as { updatedAt: string };
      baseUpdatedAt.current = body.updatedAt;
      setState("saved");
      setMessage(null);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not save.");
    }
  }, [characterId]);

  const change = useCallback(
    (pdfName: string, value: string) => {
      setValues((prev) => ({ ...prev, [pdfName]: value }));
      setState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(save, SAVE_DEBOUNCE_MS);
    },
    [save],
  );

  // Flush a pending edit if the tab is closed mid-keystroke.
  useEffect(() => {
    const flush = () => {
      if (timer.current) {
        clearTimeout(timer.current);
        void save();
      }
    };
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [save]);

  const renderOverlay = useCallback(
    (pageIndex: number) => (
      <>
        {(byPage.get(pageIndex) ?? []).map((field) => {
          const value = values[field.pdfName] ?? "";
          const style: React.CSSProperties = {
            left: field.x,
            top: field.y,
            width: field.w,
            height: field.h,
            fontSize: fontSizeFor(field),
            textAlign: alignmentFor(field),
          };
          const className = `sheet-input${value ? " is-filled" : ""}`;

          if (field.type === "textarea") {
            return (
              <textarea
                key={field.id}
                className={className}
                style={{ ...style, paddingTop: 1.5 }}
                value={value}
                tabIndex={field.order + 1}
                onChange={(e) => change(field.pdfName, e.target.value)}
              />
            );
          }

          if (field.type === "checkbox") {
            return (
              <input
                key={field.id}
                type="checkbox"
                className="absolute"
                style={{ left: field.x, top: field.y, width: field.w, height: field.h }}
                checked={value === "true"}
                tabIndex={field.order + 1}
                onChange={(e) => change(field.pdfName, e.target.checked ? "true" : "")}
              />
            );
          }

          if (field.type === "select" || field.type === "radio") {
            return (
              <select
                key={field.id}
                className={className}
                style={style}
                value={value}
                tabIndex={field.order + 1}
                onChange={(e) => change(field.pdfName, e.target.value)}
              >
                <option value="" />
                {(field.options ?? []).map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            );
          }

          return (
            <input
              key={field.id}
              className={className}
              style={style}
              value={value}
              maxLength={field.maxLen ?? undefined}
              tabIndex={field.order + 1}
              onChange={(e) => change(field.pdfName, e.target.value)}
            />
          );
        })}
      </>
    ),
    [byPage, values, change],
  );

  return (
    <div>
      <div className="sticky top-14 z-30 mb-4 flex items-center gap-3 rounded-lg border border-ink-600/70 bg-ink-800/90 px-4 py-2 text-sm backdrop-blur">
        <SaveBadge state={state} />
        {message && <span className="text-parchment-dim">{message}</span>}
        {state === "stale" && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border border-ember/60 px-2 py-1 text-xs text-ember hover:bg-ember/10"
          >
            Reload
          </button>
        )}
        <span className="ml-auto text-xs text-parchment-dim">
          {fields.length} fields · changes save on their own
        </span>
      </div>
      <SheetSurface pdfUrl={pdfUrl} pageSizes={pageSizes} renderOverlay={renderOverlay} />
    </div>
  );
}

function SaveBadge({ state }: { state: SaveState }) {
  const map: Record<SaveState, { label: string; className: string }> = {
    idle: { label: "Up to date", className: "text-parchment-dim" },
    dirty: { label: "Unsaved changes", className: "text-gold" },
    saving: { label: "Saving…", className: "text-gold" },
    saved: { label: "Saved", className: "text-moss" },
    error: { label: "Save failed", className: "text-blood" },
    stale: { label: "Out of date", className: "text-blood" },
  };
  const { label, className } = map[state];
  return <span className={`font-medium ${className}`}>{label}</span>;
}
