import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentCampaign } from "@/lib/campaigns";
import { NewCharacterForm } from "@/components/NewCharacterForm";

export const dynamic = "force-dynamic";

export default async function NewCharacterPage() {
  const [owners, templates, campaign] = await Promise.all([
    prisma.owner.findMany({ orderBy: { name: "asc" } }),
    prisma.template.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, _count: { select: { fields: true } } },
    }),
    getCurrentCampaign(),
  ]);

  return (
    <div className="mx-auto max-w-md">
      <Link href="/" className="text-sm text-parchment-dim hover:text-parchment">
        ← Roster
      </Link>
      <h1 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-parchment">
        New character
      </h1>
      <p className="mb-6 mt-1 text-sm text-parchment-dim">
        Joins the {campaign.name} roster. You can bring them into other campaigns later.
      </p>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-ink-600/70 bg-ink-800/50 p-4 text-sm text-parchment-dim">
          There are no sheets yet.{" "}
          <Link href="/templates/new" className="text-ember underline">
            Upload one first
          </Link>
          .
        </p>
      ) : (
        <NewCharacterForm
          owners={owners}
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            fieldCount: t._count.fields,
          }))}
        />
      )}
    </div>
  );
}
