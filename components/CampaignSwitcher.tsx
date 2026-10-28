"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { switchCampaign } from "@/app/campaigns/actions";
import type { CampaignOption } from "@/lib/campaigns";

const MANAGE = "__manage";

/** Picks which campaign the roster, documents and forge show in this browser. */
export function CampaignSwitcher({
  campaigns,
  currentId,
}: {
  campaigns: CampaignOption[];
  currentId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      aria-label="Campaign"
      value={currentId}
      disabled={pending}
      onChange={(event) => {
        const id = event.target.value;
        if (id === MANAGE) {
          router.push("/campaigns");
          return;
        }
        startTransition(() => switchCampaign(id));
      }}
      className="max-w-48 truncate rounded-md border border-ink-500 bg-ink-800 px-2 py-1 font-[family-name:var(--font-display)] text-sm text-gold outline-none focus:border-ember disabled:opacity-60"
    >
      {campaigns.map((campaign) => (
        <option key={campaign.id} value={campaign.id}>
          {campaign.name}
        </option>
      ))}
      <option value={MANAGE}>New or manage…</option>
    </select>
  );
}
