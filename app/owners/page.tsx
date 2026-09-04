import { prisma } from "@/lib/db";
import { addOwner, removeOwner } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function OwnersPage() {
  const owners = await prisma.owner.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { characters: true } } },
  });

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-parchment">Players</h1>
      <p className="mb-6 mt-1 text-sm text-parchment-dim">
        Names used to label who owns each character. There are no accounts and nothing is locked —
        this is just a label.
      </p>

      <form action={addOwner} className="mb-6 flex gap-2">
        <input
          name="name"
          required
          placeholder="Name"
          className="flex-1 rounded-md border border-ink-500 bg-ink-800 px-3 py-2 text-parchment outline-none placeholder:text-parchment-dim/40 focus:border-ember"
        />
        <input
          type="color"
          name="color"
          defaultValue="#d8763a"
          aria-label="Colour"
          className="h-10 w-14 rounded-md border border-ink-500 bg-ink-800 p-1"
        />
        <button
          type="submit"
          className="rounded-md bg-ember px-4 py-2 text-sm font-medium text-ink-900 hover:bg-ember/90"
        >
          Add
        </button>
      </form>

      <ul className="space-y-2">
        {owners.map((owner) => (
          <li
            key={owner.id}
            className="flex items-center gap-3 rounded-lg border border-ink-600/70 bg-ink-800/60 px-4 py-3"
          >
            <span
              aria-hidden
              className="size-3 rounded-full ring-1 ring-ink-500"
              style={{ background: owner.color ?? "#8a7f6d" }}
            />
            <span className="text-parchment">{owner.name}</span>
            <span className="text-xs text-parchment-dim">
              {owner._count.characters} character{owner._count.characters === 1 ? "" : "s"}
            </span>
            {owner._count.characters === 0 ? (
              <form action={removeOwner} className="ml-auto">
                <input type="hidden" name="id" value={owner.id} />
                <button
                  type="submit"
                  className="text-xs text-parchment-dim/60 hover:text-blood"
                >
                  Remove
                </button>
              </form>
            ) : (
              <span className="ml-auto text-xs text-parchment-dim/40">in use</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
