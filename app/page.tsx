import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { getCurrentCampaign } from "@/lib/campaigns";
import { getPartyLook } from "@/lib/themeStore";
import { RosterBoard } from "@/components/RosterBoard";
import type { RosterCharacter } from "@/components/CharacterCard";
import type { CharacterSummary } from "@/lib/roles";

export const dynamic = "force-dynamic";

const rosterInclude = {
  owner: true,
  template: { select: { name: true } },
  campaigns: {
    select: { status: true, campaign: { select: { id: true, name: true } } },
    orderBy: { campaign: { createdAt: "asc" } },
  },
} satisfies Prisma.CharacterInclude;

type RosterRow = Prisma.CharacterGetPayload<{ include: typeof rosterInclude }>;

export default async function RosterPage() {
  const campaign = await getCurrentCampaign();
  const [characters, others, owners, templateCount, look] = await Promise.all([
    prisma.character.findMany({
      where: { campaigns: { some: { campaignId: campaign.id } } },
      orderBy: { updatedAt: "desc" },
      include: rosterInclude,
    }),
    // Everyone else in the world, for bringing into this campaign.
    prisma.character.findMany({
      where: { campaigns: { none: { campaignId: campaign.id } } },
      orderBy: { displayName: "asc" },
      include: rosterInclude,
    }),
    prisma.owner.findMany({ orderBy: { name: "asc" } }),
    prisma.template.count(),
    getPartyLook(),
  ]);

  if (templateCount === 0) {
    return <EmptyState />;
  }

  function toRoster(character: RosterRow): RosterCharacter {
    return {
      id: character.id,
      displayName: character.displayName,
      status:
        character.campaigns.find((m) => m.campaign.id === campaign.id)?.status ?? "ALIVE",
      summary: (character.summary ?? {}) as CharacterSummary,
      templateName: character.template.name,
      owner: character.owner,
      portraitFileId: character.portraitFileId,
      elsewhere: character.campaigns
        .filter((m) => m.campaign.id !== campaign.id)
        .map((m) => m.campaign.name),
    };
  }

  return (
    <RosterBoard
      key={campaign.id}
      campaignId={campaign.id}
      campaignName={campaign.name}
      initialCharacters={characters.map(toRoster)}
      others={others.map(toRoster)}
      owners={owners}
      cardStyle={look.cardStyle}
    />
  );
}

function EmptyState() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-ink-600/70 bg-ink-800/50 p-8 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
        Add your sheet to begin
      </h1>
      <p className="mt-3 text-sm text-parchment-dim">
        Upload the blank fillable PDF your group plays with. Its form fields are read
        automatically, so the editor matches your sheet exactly, without anything to lay out by
        hand.
      </p>
      <Link
        href="/templates/new"
        className="mt-6 inline-block rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90"
      >
        Upload a sheet
      </Link>
    </div>
  );
}
