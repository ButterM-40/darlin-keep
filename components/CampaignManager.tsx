"use client";

import { useState, useTransition } from "react";
import {
  createCampaign,
  deleteCampaign,
  renameCampaign,
  switchCampaign,
} from "@/app/campaigns/actions";
import { useConfirm } from "@/components/ConfirmDialog";

interface CampaignRow {
  id: string;
  name: string;
  characters: number;
  documents: number;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function CampaignManager({
  campaigns,
  currentId,
}: {
  campaigns: CampaignRow[];
  currentId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const { confirm, dialog } = useConfirm();

  function run(action: () => Promise<{ ok: boolean; error?: string } | void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result && !result.ok) {
        setError(result.error ?? "That didn't work. Try again.");
        return;
      }
      after?.();
    });
  }

  async function remove(campaign: CampaignRow) {
    const ok = await confirm({
      title: `Delete ${campaign.name}?`,
      body: (
        <>
          {campaign.characters ? (
            <p>
              {plural(campaign.characters, "character")} will leave its roster. Their sheets are
              kept.
            </p>
          ) : null}
          {campaign.documents ? (
            <p>{plural(campaign.documents, "document")} will be shared with every campaign.</p>
          ) : null}
        </>
      ),
      confirmLabel: "Delete campaign",
    });
    if (ok) run(() => deleteCampaign(campaign.id));
  }

  return (
    <div className="space-y-6">
      {dialog}
      <ul className="divide-y divide-ink-600/60 rounded-xl border border-ink-600/70 bg-ink-800/60">
        {campaigns.map((campaign) => {
          const current = campaign.id === currentId;
          return (
            <li key={campaign.id} className="flex flex-wrap items-center gap-3 p-4">
              {editing === campaign.id ? (
                <form
                  className="flex min-w-0 flex-1 gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(
                      () => renameCampaign(campaign.id, draft),
                      () => setEditing(null),
                    );
                  }}
                >
                  <input
                    autoFocus
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    aria-label="Campaign name"
                    maxLength={60}
                    className="min-w-0 flex-1 rounded-md border border-ink-500 bg-ink-800 px-2 py-1 text-parchment outline-none focus:border-ember"
                  />
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-ember px-3 py-1 text-sm font-medium text-ink-900 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="rounded-md px-2 py-1 text-sm text-parchment-dim hover:text-parchment"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-[family-name:var(--font-display)] text-lg text-parchment">
                      {campaign.name}
                      {current ? (
                        <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 align-middle font-sans text-[11px] text-gold">
                          Current
                        </span>
                      ) : null}
                    </p>
                    <p className="text-xs text-parchment-dim">
                      {plural(campaign.characters, "character")} ·{" "}
                      {plural(campaign.documents, "document")}
                    </p>
                  </div>
                  {current ? null : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => switchCampaign(campaign.id))}
                      className="rounded-md border border-ink-500 px-3 py-1 text-sm text-parchment hover:border-ember disabled:opacity-50"
                    >
                      Switch to
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(campaign.id);
                      setDraft(campaign.name);
                    }}
                    className="rounded-md px-2 py-1 text-sm text-parchment-dim hover:text-parchment"
                  >
                    Rename
                  </button>
                  {campaigns.length > 1 ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => void remove(campaign)}
                      className="rounded-md px-2 py-1 text-sm text-parchment-dim/60 hover:text-blood disabled:opacity-50"
                    >
                      Delete
                    </button>
                  ) : null}
                </>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          run(
            () => createCampaign(newName),
            () => setNewName(""),
          );
        }}
      >
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="New campaign, e.g. The Sunless Road"
          aria-label="New campaign name"
          maxLength={60}
          className="min-w-0 flex-1 rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember"
        />
        <button
          type="submit"
          disabled={pending || !newName.trim()}
          className="rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90 disabled:opacity-50"
        >
          Start campaign
        </button>
      </form>

      {error ? <p className="text-sm text-blood">{error}</p> : null}
    </div>
  );
}
