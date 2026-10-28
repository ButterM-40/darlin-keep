import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { asFieldValues } from "@/lib/characters";
import { PortraitPicker } from "@/components/PortraitPicker";
import { PortraitShowcase } from "@/components/PortraitShowcase";
import { SheetEditor, type EditorField } from "@/components/SheetEditor";
import type { PageSize } from "@/components/SheetSurface";

export const dynamic = "force-dynamic";

export default async function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      owner: true,
      _count: { select: { notebooks: true } },
      template: {
        select: {
          id: true,
          name: true,
          pageSizes: true,
          fields: { orderBy: { order: "asc" } },
        },
      },
    },
  });

  if (!character) notFound();

  const pageSizes = character.template.pageSizes as unknown as PageSize[];
  const fields: EditorField[] = character.template.fields.map((f) => ({
    id: f.id,
    pdfName: f.pdfName,
    page: f.page,
    x: f.x,
    y: f.y,
    w: f.w,
    h: f.h,
    type: f.type,
    options: (f.options as string[] | null) ?? null,
    maxLen: f.maxLen,
    order: f.order,
    role: f.role,
  }));

  const hasName = character.template.fields.some((f) => f.role === "displayName");

  return (
    <div className="relative mx-auto max-w-4xl">
      <PortraitShowcase fileId={character.portraitFileId} name={character.displayName} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/" className="text-sm text-parchment-dim hover:text-parchment">
          ← Roster
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
          {character.displayName}
        </h1>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-900"
          style={{ background: character.owner.color ?? "var(--color-owner-default)" }}
        >
          {character.owner.name}
        </span>
        <Link
          href={`/characters/${character.id}/notebooks`}
          className="ml-auto rounded-md border border-ink-500 px-3 py-1.5 text-sm text-parchment hover:border-ember"
        >
          Notebooks
          {character._count.notebooks ? (
            <span className="ml-1.5 text-parchment-dim">{character._count.notebooks}</span>
          ) : null}
        </Link>
        <Link
          href={`/characters/${character.id}/sheet`}
          className="rounded-md border border-ink-500 px-3 py-1.5 text-sm text-parchment hover:border-ember"
        >
          Full sheet
        </Link>
        <PortraitPicker characterId={character.id} portraitFileId={character.portraitFileId} />
      </div>

      {!hasName ? (
        <p className="mb-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm text-parchment">
          No field on this sheet is marked as the character name yet, so the roster cannot label
          it.{" "}
          <Link
            href={`/templates/${character.template.id}/roles`}
            className="underline hover:text-gold"
          >
            Point out which box holds the name
          </Link>
          .
        </p>
      ) : null}

      <SheetEditor
        characterId={character.id}
        pdfUrl={`/api/templates/${character.template.id}/pdf`}
        pageSizes={pageSizes}
        fields={fields}
        initialValues={asFieldValues(character.values)}
        initialUpdatedAt={character.updatedAt.toISOString()}
      />
    </div>
  );
}
