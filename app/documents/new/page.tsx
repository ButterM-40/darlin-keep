import Link from "next/link";
import { prisma } from "@/lib/db";
import { NewDocumentForm } from "@/components/NewDocumentForm";

export const dynamic = "force-dynamic";

export default async function NewDocumentPage() {
  const owners = await prisma.owner.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="mx-auto max-w-lg">
      <Link href="/documents" className="text-sm text-parchment-dim hover:text-parchment">
        ← Documents
      </Link>
      <h1 className="mb-6 mt-3 font-[family-name:var(--font-display)] text-2xl text-parchment">
        Add document
      </h1>

      <NewDocumentForm owners={owners} />
    </div>
  );
}
