"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentOwner, type OwnerOption } from "@/components/WhoAmI";
import {
  DOC_KINDS,
  KIND_BLURBS,
  KIND_LABELS,
  MAX_UPLOAD_BYTES,
  formatBytes,
  type DocKind,
} from "@/lib/documents";

export function NewDocumentForm({
  owners,
  campaignName,
}: {
  owners: OwnerOption[];
  campaignName: string;
}) {
  const router = useRouter();
  const { ownerId } = useCurrentOwner(owners);
  const [kind, setKind] = useState<DocKind>("PDF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    formData.set("kind", kind);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: formData });
      const body = (await response.json()) as { id?: string; error?: string };
      if (!response.ok || !body.id) {
        setError(body.error ?? "That could not be saved.");
        return;
      }
      router.push(`/documents/${body.id}`);
    } catch {
      setError("That could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={submit} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm text-parchment-dim">Type</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {DOC_KINDS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setKind(option)}
              className={
                kind === option
                  ? "rounded-lg border border-ember bg-ember/15 p-3 text-left"
                  : "rounded-lg border border-ink-500 p-3 text-left hover:border-ember/60"
              }
            >
              <span className="block text-sm text-parchment">{KIND_LABELS[option]}</span>
              <span className="mt-0.5 block text-xs text-parchment-dim">
                {KIND_BLURBS[option]}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="mb-1.5 block text-sm text-parchment-dim">Title</span>
        <input
          name="title"
          required
          placeholder={
            kind === "BOARD" ? "e.g. Ravenmoor inspiration" : "e.g. House rules v3"
          }
          className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember"
        />
      </label>

      {kind === "PDF" ? (
        <label className="block">
          <span className="mb-1.5 block text-sm text-parchment-dim">
            PDF file{" "}
            <span className="text-parchment-dim/60">
              (up to {formatBytes(MAX_UPLOAD_BYTES)})
            </span>
          </span>
          <input
            type="file"
            name="pdf"
            accept="application/pdf,.pdf"
            required
            className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-parchment file:mr-3 file:rounded file:border-0 file:bg-ink-600 file:px-3 file:py-1.5 file:text-parchment"
          />
        </label>
      ) : null}

      {kind === "LINK" ? (
        <label className="block">
          <span className="mb-1.5 block text-sm text-parchment-dim">Address</span>
          <input
            name="url"
            required
            placeholder="roll20.net/campaign/… or a Google Doc"
            className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-sm text-parchment-dim">
          Note <span className="text-parchment-dim/60">(optional)</span>
        </span>
        <textarea
          name="note"
          rows={2}
          className="w-full resize-y rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none focus:border-ember"
        />
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-parchment-dim">
          Added by <span className="text-parchment-dim/60">(optional)</span>
        </span>
        <select
          name="ownerId"
          key={ownerId}
          defaultValue={ownerId}
          className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none focus:border-ember"
        >
          <option value="">Nobody in particular</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-start gap-2.5 text-sm">
        <input type="checkbox" name="shared" className="mt-0.5 accent-ember" />
        <span>
          <span className="text-parchment">Share with every campaign</span>
          <span className="block text-xs text-parchment-dim">
            Otherwise it only shows up in {campaignName}.
          </span>
        </span>
      </label>

      {error ? <p className="text-sm text-blood">{error}</p> : null}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-md bg-ember px-4 py-2.5 font-medium text-ink-900 hover:bg-ember/90 disabled:opacity-50"
      >
        {busy ? "Saving…" : kind === "BOARD" ? "Create board" : "Add document"}
      </button>
    </form>
  );
}
