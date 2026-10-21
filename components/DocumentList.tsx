"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { deleteDocument } from "@/app/actions";
import { DOC_KINDS, KIND_LABELS, hostOf, type DocKind } from "@/lib/documents";

export interface DocumentRow {
  id: string;
  kind: DocKind;
  title: string;
  note: string | null;
  url: string | null;
  pageCount: number | null;
  itemCount: number;
  owner: { name: string; color: string | null } | null;
  updatedAt: string;
}

const ICONS: Record<DocKind, string> = { PDF: "▤", LINK: "↗", BOARD: "▦" };

export function DocumentList({ initial }: { initial: DocumentRow[] }) {
  const [documents, setDocuments] = useState(initial);
  const [kinds, setKinds] = useState<Set<DocKind>>(new Set());
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((doc) => {
      if (kinds.size > 0 && !kinds.has(doc.kind)) return false;
      if (!needle) return true;
      return (
        doc.title.toLowerCase().includes(needle) ||
        (doc.note ?? "").toLowerCase().includes(needle) ||
        (doc.url ?? "").toLowerCase().includes(needle)
      );
    });
  }, [documents, kinds, query]);

  function toggle(kind: DocKind) {
    setKinds((current) => {
      const next = new Set(current);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

  function remove(id: string) {
    const rollback = documents;
    setDocuments((current) => current.filter((d) => d.id !== id));
    startTransition(async () => {
      try {
        await deleteDocument(id);
      } catch {
        setDocuments(rollback);
      }
    });
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        {DOC_KINDS.map((kind) => {
          const on = kinds.has(kind);
          const count = documents.filter((d) => d.kind === kind).length;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => toggle(kind)}
              className={
                on
                  ? "rounded-full border border-ember bg-ember/20 px-3 py-1 text-sm text-parchment"
                  : "rounded-full border border-ink-500 px-3 py-1 text-sm text-parchment-dim hover:border-ember/60"
              }
            >
              {ICONS[kind]} {KIND_LABELS[kind]}{" "}
              <span className="text-parchment-dim/60">{count}</span>
            </button>
          );
        })}

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search…"
          className="ml-auto w-48 rounded-md border border-ink-500 bg-ink-800 px-3 py-1.5 text-sm text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember"
        />
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg border border-ink-600/70 bg-ink-800/50 p-6 text-sm text-parchment-dim">
          {documents.length === 0
            ? "Nothing here yet. Add a PDF, a link, or a board."
            : "Nothing matches that."}
        </p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((doc) => (
            <li
              key={doc.id}
              className="group relative flex flex-col rounded-xl border border-ink-600/70 bg-ink-800/60 p-4 transition hover:border-ember/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span aria-hidden className="text-parchment-dim/70">
                    {ICONS[doc.kind]}
                  </span>
                  <h3 className="truncate font-[family-name:var(--font-display)] text-lg text-parchment">
                    <CardLink doc={doc} />
                  </h3>
                </div>
                {doc.note ? (
                  <p className="mt-1 line-clamp-2 text-sm text-parchment-dim">{doc.note}</p>
                ) : null}
              </div>

              <div className="mt-3 flex items-center gap-2 border-t border-ink-600/60 pt-3 text-xs text-parchment-dim/70">
                <span>
                  {doc.kind === "PDF"
                    ? `${doc.pageCount ?? 1} page${doc.pageCount === 1 ? "" : "s"}`
                    : doc.kind === "BOARD"
                      ? `${doc.itemCount} image${doc.itemCount === 1 ? "" : "s"}`
                      : hostOf(doc.url ?? "")}
                </span>
                {doc.owner ? (
                  <span className="flex items-center gap-1.5">
                    <span
                      aria-hidden
                      className="size-2 rounded-full"
                      style={{ background: doc.owner.color ?? "#8a7f6d" }}
                    />
                    {doc.owner.name}
                  </span>
                ) : null}

                <button
                  type="button"
                  onClick={() => remove(doc.id)}
                  className="relative z-10 ml-auto rounded-md px-1.5 py-0.5 text-parchment-dim/40 opacity-0 transition hover:text-blood focus:opacity-100 group-hover:opacity-100"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The card's one link, stretched over the whole card so a click anywhere goes
 * straight to the document. A link document opens its site directly instead
 * of an intermediate page that only holds the address.
 */
function CardLink({ doc }: { doc: DocumentRow }) {
  const className = "outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ember";
  if (doc.kind === "LINK" && doc.url) {
    return (
      <a href={doc.url} target="_blank" rel="noopener noreferrer" className={className}>
        {doc.title}
      </a>
    );
  }
  return (
    <Link href={`/documents/${doc.id}`} className={className}>
      {doc.title}
    </Link>
  );
}
