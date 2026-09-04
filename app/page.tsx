import Link from "next/link";
import { prisma } from "@/lib/db";
import { RosterBoard } from "@/components/RosterBoard";
import type { RosterCharacter } from "@/components/CharacterCard";
import type { CharacterSummary } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function RosterPage() {
  const [characters, owners, templateCount] = await Promise.all([
    prisma.character.findMany({
      orderBy: { updatedAt: "desc" },
      include: { owner: true, template: { select: { name: true } } },
    }),
    prisma.owner.findMany({ orderBy: { name: "asc" } }),
    prisma.template.count(),
  ]);

  if (templateCount === 0) {
    return <EmptyState />;
  }

  const roster: RosterCharacter[] = characters.map((character) => ({
    id: character.id,
    displayName: character.displayName,
    status: character.status,
    summary: (character.summary ?? {}) as CharacterSummary,
    templateName: character.template.name,
    owner: character.owner,
  }));

  return (
    <div>
      <div className="mb-8 flex items-center justify-end">
        <Link
          href="/characters/new"
          className="rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90"
        >
          New character
        </Link>
      </div>

      <RosterBoard initialCharacters={roster} owners={owners} />
    </div>
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
