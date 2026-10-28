"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, formatBytes } from "@/lib/documents";

/**
 * The button for a character's optional picture. The picture itself is shown
 * beside the sheet; without one there is no frame and no placeholder anywhere.
 * With no picture it goes straight to choosing a file; with one it opens a
 * small menu to upload a replacement or remove it.
 */
export function PortraitPicker({
  characterId,
  portraitFileId,
}: {
  characterId: string;
  portraitFileId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Clicking anywhere else, or pressing Escape, closes the menu.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  async function upload(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setError("That file isn't a picture we can show. Pick a JPG, PNG or WebP.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`That picture is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`);
      return;
    }
    const form = new FormData();
    form.append("image", file);
    await send(fetch(`/api/characters/${characterId}/portrait`, { method: "POST", body: form }));
  }

  async function send(request: Promise<Response>) {
    setBusy(true);
    setError(null);
    try {
      const response = await request;
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Couldn't save the picture. Try again.");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const buttonClass =
    "rounded-md border border-ink-500 px-3 py-1.5 text-sm text-parchment hover:border-ember disabled:cursor-wait disabled:opacity-60";
  const itemClass =
    "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-ink-700/60 focus:bg-ink-700/60 focus:outline-none";

  return (
    <div ref={menuRef} className="relative flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) void upload(file);
        }}
      />

      {portraitFileId ? (
        <button
          type="button"
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
          className={buttonClass}
        >
          {busy ? "Saving…" : "Change picture"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className={buttonClass}
        >
          {busy ? "Saving…" : "Add a picture"}
        </button>
      )}

      {menuOpen ? (
        <div
          role="menu"
          className="absolute top-full right-0 z-35 mt-1.5 w-52 rounded-lg border border-ink-600/70 bg-ink-800 p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              fileRef.current?.click();
            }}
            className={`${itemClass} text-parchment`}
          >
            Upload a new picture
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenuOpen(false);
              void send(fetch(`/api/characters/${characterId}/portrait`, { method: "DELETE" }));
            }}
            className={`${itemClass} text-blood`}
          >
            Remove current picture
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-blood">
          {error}
        </p>
      ) : null}
    </div>
  );
}
