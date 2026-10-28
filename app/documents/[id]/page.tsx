import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Corkboard, type BoardItemView } from "@/components/Corkboard";
import { PdfViewer } from "@/components/PdfViewer";
import type { PageSize } from "@/components/SheetSurface";
import { KIND_LABELS, hostOf } from "@/lib/documents";

export const dynamic = "force-dynamic";

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: true,
      items: { orderBy: { z: "asc" } },
    },
  });
  if (!doc) notFound();

  return (
    <div className={doc.kind === "BOARD" ? "mx-auto max-w-6xl" : "mx-auto max-w-4xl"}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/documents" className="text-sm text-parchment-dim hover:text-parchment">
          ← Documents
        </Link>
        <div className="min-w-0">
          <h1 className="truncate font-[family-name:var(--font-display)] text-2xl text-parchment">
            {doc.title}
          </h1>
          {doc.note ? <p className="text-sm text-parchment-dim">{doc.note}</p> : null}
        </div>

        <span className="rounded-full border border-ink-500 px-2 py-0.5 text-[11px] text-parchment-dim">
          {KIND_LABELS[doc.kind]}
        </span>
        {doc.owner ? (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-900"
            style={{ background: doc.owner.color ?? "var(--color-owner-default)" }}
          >
            {doc.owner.name}
          </span>
        ) : null}

        {doc.kind === "PDF" && doc.fileId ? (
          <a
            href={`/api/files/${doc.fileId}?download=1`}
            className="ml-auto rounded-md bg-ember px-3 py-1.5 text-sm font-medium text-ink-900 hover:bg-ember/90"
          >
            Download
          </a>
        ) : null}
      </div>

      {doc.kind === "PDF" && doc.fileId ? (
        <PdfViewer
          pdfUrl={`/api/files/${doc.fileId}`}
          pageSizes={(doc.pageSizes as unknown as PageSize[]) ?? [{ width: 595, height: 842 }]}
        />
      ) : null}

      {doc.kind === "LINK" && doc.url ? <LinkCard url={doc.url} /> : null}

      {doc.kind === "BOARD" ? (
        <Corkboard
          documentId={doc.id}
          initialItems={doc.items.map(
            (item): BoardItemView => ({
              id: item.id,
              fileId: item.fileId,
              x: item.x,
              y: item.y,
              w: item.w,
              h: item.h,
              z: item.z,
              caption: item.caption,
            }),
          )}
        />
      ) : null}
    </div>
  );
}

function LinkCard({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl border border-ink-600/70 bg-ink-800/60 p-6 transition hover:border-ember/60"
    >
      <p className="text-sm text-parchment-dim">Opens in a new tab</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-ember">
        {hostOf(url)}
      </p>
      <p className="mt-2 break-all text-xs text-parchment-dim/70">{url}</p>
    </a>
  );
}
