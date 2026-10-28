import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { toNotebookView } from "@/lib/notebooks";
import { Notebooks } from "@/components/Notebooks";

export const dynamic = "force-dynamic";

export default async function CharacterNotebooksPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { n } = await searchParams;

  const character = await prisma.character.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      owner: true,
      notebooks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!character) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link
          href={`/characters/${character.id}`}
          className="text-sm text-parchment-dim hover:text-parchment"
        >
          ← Sheet
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
          {character.displayName}’s notebooks
        </h1>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-900"
          style={{ background: character.owner.color ?? "var(--color-owner-default)" }}
        >
          {character.owner.name}
        </span>
      </div>

      <Notebooks
        characterId={character.id}
        initial={character.notebooks.map(toNotebookView)}
        initialSelected={typeof n === "string" ? n : null}
      />
    </div>
  );
}
