import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PdfViewer } from "@/components/PdfViewer";
import { PortraitShowcase, PortraitThumb } from "@/components/PortraitShowcase";
import type { PageSize } from "@/components/SheetSurface";

export const dynamic = "force-dynamic";

/** The read-only page: the character's sheet as a genuine, filled PDF. */
export default async function CharacterSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const character = await prisma.character.findUnique({
    where: { id },
    select: {
      id: true,
      displayName: true,
      summary: true,
      updatedAt: true,
      portraitFileId: true,
      owner: true,
      template: { select: { name: true, pageSizes: true } },
    },
  });

  if (!character) notFound();

  const pageSizes = character.template.pageSizes as unknown as PageSize[];
  const summary = (character.summary ?? {}) as Record<string, string | undefined>;
  const facts = [summary.species, summary.classLevel, summary.hp && `HP ${summary.hp}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="relative mx-auto max-w-4xl">
      <PortraitShowcase fileId={character.portraitFileId} name={character.displayName} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm text-parchment-dim hover:text-parchment">
          ← Roster
        </Link>
        <PortraitThumb fileId={character.portraitFileId} name={character.displayName} />
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
            {character.displayName}
          </h1>
          {facts ? <p className="text-sm text-parchment-dim">{facts}</p> : null}
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-900"
          style={{ background: character.owner.color ?? "var(--color-owner-default)" }}
        >
          {character.owner.name}
        </span>

        <div className="ml-auto flex gap-2">
          <Link
            href={`/characters/${character.id}/notebooks`}
            className="rounded-md border border-ink-500 px-3 py-1.5 text-sm text-parchment hover:border-ember"
          >
            Notebooks
          </Link>
          <Link
            href={`/characters/${character.id}`}
            className="rounded-md border border-ink-500 px-3 py-1.5 text-sm text-parchment hover:border-ember"
          >
            Edit
          </Link>
          <a
            href={`/api/characters/${character.id}/pdf?download=1&flatten=1`}
            className="rounded-md bg-ember px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-ember/90"
          >
            Download PDF
          </a>
        </div>
      </div>

      <PdfViewer
        pdfUrl={`/api/characters/${character.id}/pdf?flatten=1`}
        pageSizes={pageSizes}
      />

      <p className="mt-4 text-center text-xs text-parchment-dim/60">
        Rendered from {character.template.name} · last saved{" "}
        {character.updatedAt.toLocaleString("en-GB")}
      </p>
    </div>
  );
}
