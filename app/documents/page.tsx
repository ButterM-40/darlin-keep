import Link from "next/link";
import { prisma } from "@/lib/db";
import { DocumentList, type DocumentRow } from "@/components/DocumentList";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      kind: true,
      title: true,
      note: true,
      url: true,
      pageCount: true,
      updatedAt: true,
      owner: { select: { name: true, color: true } },
      _count: { select: { items: true } },
    },
  });

  const rows: DocumentRow[] = documents.map((doc) => ({
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    note: doc.note,
    url: doc.url,
    pageCount: doc.pageCount,
    itemCount: doc._count.items,
    owner: doc.owner,
    updatedAt: doc.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
            Documents
          </h1>
          <p className="mt-1 text-sm text-parchment-dim">
            Handouts, maps, reference links and image boards.
          </p>
        </div>
        <Link
          href="/documents/new"
          className="rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90"
        >
          Add document
        </Link>
      </div>

      <DocumentList initial={rows} />
    </div>
  );
}
