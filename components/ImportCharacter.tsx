"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentOwner, type OwnerOption } from "@/components/WhoAmI";

/** Turns an already-filled copy of this sheet into a character. */
export function ImportCharacter({
  templateId,
  owners,
}: {
  templateId: string;
  owners: OwnerOption[];
}) {
  const router = useRouter();
  const { ownerId } = useCurrentOwner(owners);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/templates/${templateId}/import`, {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as {
        id?: string;
        error?: string;
        skipped?: number;
      };
      if (!response.ok || !body.id) {
        setError(body.error ?? "Import failed.");
        return;
      }
      router.push(`/characters/${body.id}`);
    } catch {
      setError("Import failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-4 rounded-md border border-ink-500 px-3 py-1.5 text-sm text-parchment-dim hover:border-ember hover:text-parchment"
      >
        Import a filled copy of this sheet
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="mb-4 space-y-3 rounded-lg border border-ink-600/70 bg-ink-800/60 p-4"
    >
      <p className="text-sm text-parchment-dim">
        Upload a completed PDF of this sheet and its answers become a new character.
      </p>

      <div className="flex flex-wrap gap-3">
        <input
          type="file"
          name="pdf"
          accept="application/pdf,.pdf"
          required
          className="min-w-56 flex-1 rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-parchment file:mr-3 file:rounded file:border-0 file:bg-ink-600 file:px-3 file:py-1.5 file:text-parchment"
        />
        <select
          name="ownerId"
          required
          key={ownerId}
          defaultValue={ownerId}
          className="rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-sm text-parchment"
        >
          <option value="">Owner…</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90 disabled:opacity-50"
        >
          {busy ? "Reading…" : "Import"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md px-3 py-2 text-sm text-parchment-dim hover:text-parchment"
        >
          Cancel
        </button>
      </div>

      {error ? <p className="text-sm text-blood">{error}</p> : null}
    </form>
  );
}
