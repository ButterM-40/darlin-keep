import Link from "next/link";
import { prisma } from "@/lib/db";
import { deleteTemplate } from "@/app/actions";
import { ROLES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.template.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      pageCount: true,
      createdAt: true,
      fields: { where: { role: { not: null } }, select: { role: true } },
      _count: { select: { fields: true, characters: true } },
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">
            Sheets
          </h1>
          <p className="mt-1 text-sm text-parchment-dim">
            Each fillable PDF you upload becomes an editable sheet.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90"
        >
          Upload a sheet
        </Link>
      </div>

      {templates.length === 0 ? (
        <p className="rounded-lg border border-ink-600/70 bg-ink-800/50 p-6 text-sm text-parchment-dim">
          Nothing uploaded yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {templates.map((template) => {
            const assigned = new Set(template.fields.map((f) => f.role));
            const missing = ROLES.filter((r) => !assigned.has(r.key));
            const nameMissing = !assigned.has("displayName");

            return (
              <li
                key={template.id}
                className="rounded-xl border border-ink-600/70 bg-ink-800/60 p-4"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-[family-name:var(--font-display)] text-lg text-parchment">
                    {template.name}
                  </h2>
                  <span className="text-xs text-parchment-dim">
                    {template._count.fields} fields · {template.pageCount} page
                    {template.pageCount === 1 ? "" : "s"} · {template._count.characters}{" "}
                    character{template._count.characters === 1 ? "" : "s"}
                  </span>

                  <div className="ml-auto flex items-center gap-2">
                    <Link
                      href={`/templates/${template.id}/roles`}
                      className="rounded-md border border-ink-500 px-2.5 py-1 text-xs text-parchment hover:border-ember"
                    >
                      Label fields
                    </Link>
                    <a
                      href={`/api/templates/${template.id}/pdf`}
                      className="rounded-md border border-ink-500 px-2.5 py-1 text-xs text-parchment hover:border-ember"
                    >
                      Blank PDF
                    </a>
                    {template._count.characters === 0 ? (
                      <form action={deleteTemplate}>
                        <input type="hidden" name="id" value={template.id} />
                        <button
                          type="submit"
                          className="rounded-md px-2 py-1 text-xs text-parchment-dim/60 hover:text-blood"
                        >
                          Delete
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 text-xs">
                  {nameMissing ? (
                    <span className="text-gold">
                      No name field labelled yet — the roster cannot title these characters.
                    </span>
                  ) : missing.length > 0 ? (
                    <span className="text-parchment-dim/70">
                      Not labelled: {missing.map((r) => r.label).join(", ")}
                    </span>
                  ) : (
                    <span className="text-moss">All roster fields labelled.</span>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
