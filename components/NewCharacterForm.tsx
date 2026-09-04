"use client";

import { newCharacter } from "@/app/actions";
import { useCurrentOwner, type OwnerOption } from "@/components/WhoAmI";
import { ROSTER_ORDER, STATUS_LABELS } from "@/lib/status";

export function NewCharacterForm({
  owners,
  templates,
}: {
  owners: OwnerOption[];
  templates: Array<{ id: string; name: string; fieldCount: number }>;
}) {
  // Defaults to whoever this browser said they were, but stays changeable.
  const { ownerId } = useCurrentOwner(owners);

  return (
    <form action={newCharacter} className="space-y-5">
      <label className="block">
        <span className="mb-1.5 block text-sm text-parchment-dim">Sheet</span>
        <select
          name="templateId"
          required
          defaultValue={templates[0]?.id}
          className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none focus:border-ember"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.fieldCount} fields)
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-parchment-dim">Owner</span>
        <select
          name="ownerId"
          required
          key={ownerId}
          defaultValue={ownerId}
          className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none focus:border-ember"
        >
          <option value="">Pick a player…</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm text-parchment-dim">Starting row</span>
        <select
          name="status"
          defaultValue="ALIVE"
          className="w-full rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none focus:border-ember"
        >
          {ROSTER_ORDER.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        className="w-full rounded-md bg-ember px-4 py-2.5 font-medium text-ink-900 hover:bg-ember/90"
      >
        Create and start filling
      </button>
    </form>
  );
}
