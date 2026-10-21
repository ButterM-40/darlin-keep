"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BODY_MAX, TITLE_MAX, type NotebookView } from "@/lib/notebooks";

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error" | "stale";

const SAVE_DEBOUNCE_MS = 800;

export function Notebooks({
  characterId,
  initial,
  initialSelected,
}: {
  characterId: string;
  initial: NotebookView[];
  initialSelected: string | null;
}) {
  const [notebooks, setNotebooks] = useState(initial);
  const [selectedId, setSelectedId] = useState(
    initial.some((n) => n.id === initialSelected) ? initialSelected : (initial[0]?.id ?? null),
  );
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [adding, setAdding] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  /** Set when a notebook is added, so its title is ready to type over once it renders. */
  const nameNext = useRef(false);

  // The debounced save fires outside render, so it reads the newest notebooks
  // here rather than capturing a stale closure.
  const latest = useRef(notebooks);
  useEffect(() => {
    latest.current = notebooks;
  }, [notebooks]);
  /** updatedAt each notebook had when this page last saw it from the server. */
  const base = useRef(new Map(initial.map((n) => [n.id, n.updatedAt])));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingId = useRef<string | null>(null);

  const selected = notebooks.find((n) => n.id === selectedId) ?? null;

  const save = useCallback(async (id: string) => {
    const notebook = latest.current.find((n) => n.id === id);
    if (!notebook) return;
    setState("saving");
    try {
      const response = await fetch(`/api/notebooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: notebook.title,
          body: notebook.body,
          baseUpdatedAt: base.current.get(id),
        }),
      });
      if (response.status === 409 || response.status === 413) {
        const body = (await response.json()) as { message?: string };
        setState(response.status === 409 ? "stale" : "error");
        setMessage(body.message ?? "This notebook could not be saved.");
        return;
      }
      if (!response.ok) throw new Error(`Save failed (${response.status})`);

      const saved = (await response.json()) as NotebookView;
      base.current.set(id, saved.updatedAt);
      setNotebooks((list) =>
        list.map((n) => (n.id === id ? { ...n, updatedAt: saved.updatedAt } : n)),
      );
      setState("saved");
      setMessage(null);
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not save.");
    }
  }, []);

  /** Saves a waiting edit now instead of after the debounce. */
  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const id = pendingId.current;
    pendingId.current = null;
    if (id) void save(id);
  }, [save]);

  function edit(patch: Partial<Pick<NotebookView, "title" | "body">>) {
    if (!selectedId || state === "stale") return;
    const id = selectedId;
    setNotebooks((list) => list.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    pendingId.current = id;
    timer.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
  }

  function select(id: string) {
    if (id === selectedId) return;
    flush();
    setSelectedId(id);
    setConfirmingDelete(false);
    setState("idle");
    setMessage(null);
    // Keeps the open notebook in the address, so a reload or shared link lands on it.
    window.history.replaceState(null, "", `?n=${id}`);
  }

  async function add() {
    flush();
    setAdding(true);
    try {
      const response = await fetch(`/api/characters/${characterId}/notebooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled notebook" }),
      });
      if (!response.ok) throw new Error(`Could not add a notebook (${response.status})`);
      const created = (await response.json()) as NotebookView;
      base.current.set(created.id, created.updatedAt);
      setNotebooks((list) => [created, ...list]);
      setSelectedId(created.id);
      setConfirmingDelete(false);
      setState("idle");
      setMessage(null);
      window.history.replaceState(null, "", `?n=${created.id}`);
      nameNext.current = true;
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Could not add a notebook.");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    if (pendingId.current === id) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      pendingId.current = null;
    }
    const rollback = notebooks;
    const rest = notebooks.filter((n) => n.id !== id);
    setNotebooks(rest);
    setSelectedId(rest[0]?.id ?? null);
    setConfirmingDelete(false);
    setState("idle");
    setMessage(null);
    window.history.replaceState(null, "", rest[0] ? `?n=${rest[0].id}` : "?");
    const response = await fetch(`/api/notebooks/${id}`, { method: "DELETE" }).catch(() => null);
    if (!response?.ok) {
      setNotebooks(rollback);
      setSelectedId(id);
      setState("error");
      setMessage("Could not delete that notebook.");
    }
  }

  useEffect(() => {
    if (!nameNext.current) return;
    nameNext.current = false;
    titleRef.current?.focus();
    titleRef.current?.select();
  }, [selectedId]);

  // Flush a pending edit if the tab is closed mid-keystroke.
  useEffect(() => {
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
      flush();
    };
  }, [flush]);

  return (
    <div className="grid items-start gap-5 md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-xl border border-ink-600/70 bg-ink-800/60 p-3">
        <button
          type="button"
          onClick={add}
          disabled={adding}
          className="w-full rounded-md bg-ember px-3 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90 disabled:opacity-60"
        >
          + Add notebook
        </button>

        {notebooks.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {notebooks.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => select(n.id)}
                  className={
                    n.id === selectedId
                      ? "w-full rounded-md border border-ember/70 bg-ink-600/70 px-3 py-2 text-left"
                      : "w-full rounded-md border border-transparent px-3 py-2 text-left hover:bg-ink-700"
                  }
                >
                  <span className="block truncate text-sm text-parchment">
                    {n.title.trim() || "Untitled notebook"}
                  </span>
                  <span className="block truncate text-xs text-parchment-dim/70">
                    {firstLine(n.body) || "Empty"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </aside>

      {selected ? (
        <section className="rounded-xl border border-ink-600/70 bg-ink-800/60">
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-600/60 px-5 py-3 text-sm">
            <SaveBadge state={state} />
            {message ? <span className="text-parchment-dim">{message}</span> : null}
            {state === "stale" ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-md border border-ember/60 px-2 py-1 text-xs text-ember hover:bg-ember/10"
              >
                Reload
              </button>
            ) : null}
            <span className="ml-auto text-xs text-parchment-dim">
              {wordCount(selected.body)} words · edited{" "}
              {new Date(selected.updatedAt).toLocaleString("en-GB", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>

          <div className="px-5 pt-4 pb-5">
            <input
              ref={titleRef}
              value={selected.title}
              maxLength={TITLE_MAX}
              onChange={(e) => edit({ title: e.target.value })}
              placeholder="Untitled notebook"
              aria-label="Notebook title"
              className="w-full bg-transparent font-[family-name:var(--font-display)] text-2xl text-parchment outline-none placeholder:text-parchment-dim/40"
            />
            <textarea
              value={selected.body}
              maxLength={BODY_MAX}
              onChange={(e) => edit({ body: e.target.value })}
              placeholder="Session notes, NPCs, debts, rumours…"
              aria-label="Notes"
              className="mt-3 min-h-[60vh] w-full resize-y rounded-md border border-ink-600/70 bg-ink-900/60 p-4 text-[15px] leading-7 text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember/60"
            />

            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
              {confirmingDelete ? (
                <>
                  <span className="text-parchment">
                    Delete “{selected.title.trim() || "Untitled notebook"}”? This can’t be undone.
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(selected.id)}
                    className="rounded-md bg-blood px-3 py-1.5 text-parchment hover:bg-blood/85"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="rounded-md border border-ink-500 px-3 py-1.5 text-parchment hover:border-ember"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="ml-auto text-xs text-parchment-dim/60 hover:text-blood"
                >
                  Delete notebook
                </button>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-xl border border-dashed border-ink-500 p-10 text-center text-sm text-parchment-dim">
          No notebooks yet. Add one for session notes, people met, quests, loot — anything this
          character wants to remember.
        </section>
      )}
    </div>
  );
}

function firstLine(text: string) {
  return text.trim().split("\n", 1)[0];
}

function wordCount(text: string) {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
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
