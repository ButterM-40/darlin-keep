import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { RolePicker, type PickerField } from "@/components/RolePicker";
import { ImportCharacter } from "@/components/ImportCharacter";
import type { PageSize } from "@/components/SheetSurface";

export const dynamic = "force-dynamic";

export default async function TemplateRolesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [template, owners] = await Promise.all([
    prisma.template.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        pageSizes: true,
        fields: {
          orderBy: { order: "asc" },
          select: { id: true, page: true, x: true, y: true, w: true, h: true, role: true },
        },
      },
    }),
    prisma.owner.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!template) notFound();

  const pageSizes = template.pageSizes as unknown as PageSize[];
  const fields: PickerField[] = template.fields;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Link href="/templates" className="text-sm text-parchment-dim hover:text-parchment">
          ← Sheets
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
          {template.name}
        </h1>
        <span className="text-xs text-parchment-dim">{fields.length} fields found</span>
      </div>

      <ImportCharacter templateId={template.id} owners={owners} />

      <RolePicker
        templateId={template.id}
        pdfUrl={`/api/templates/${template.id}/pdf`}
        pageSizes={pageSizes}
        fields={fields}
      />
    </div>
  );
}
