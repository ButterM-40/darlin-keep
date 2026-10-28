import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { getCurrentCampaign } from "@/lib/campaigns";
import { CampaignManager } from "@/components/CampaignManager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Campaigns · Darlin Keep",
};

export default async function CampaignsPage() {
  const [campaigns, current] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        _count: { select: { members: true, documents: true } },
      },
    }),
    getCurrentCampaign(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
        Campaigns
      </h1>
      <p className="mt-1 mb-6 text-sm text-parchment-dim">
        Every campaign shares one world, so a character can be on several rosters at once, in a
        different row on each. The campaign picked in the header is remembered per browser.
      </p>

      <CampaignManager
        currentId={current.id}
        campaigns={campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          characters: c._count.members,
          documents: c._count.documents,
        }))}
      />
    </div>
  );
}
