import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

/** The history shown in the forge; older attempts stay in the table. */
const HISTORY_LIMIT = 200;

const include = {
  character: {
    select: { displayName: true, owner: { select: { name: true, color: true } } },
  },
  entries: { orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT },
} satisfies Prisma.BlacksmithInclude;

type BlacksmithRow = Prisma.BlacksmithGetPayload<{ include: typeof include }>;

export type Counts = Record<string, number>;

/** Reads a { [key]: number } JSON column, dropping anything else. */
export function asCounts(value: unknown): Counts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Counts = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}

function serialize(row: BlacksmithRow) {
  return {
    id: row.id,
    characterId: row.characterId,
    name: row.character.displayName,
    owner: row.character.owner.name,
    ownerColor: row.character.owner.color,
    level: row.level,
    tokensSpent: row.tokensSpent,
    tokenDebt: row.tokenDebt,
    stock: asCounts(row.stock),
    modifiers: asCounts(row.modifiers),
    entries: row.entries.map((e) => ({
      id: e.id,
      action: e.action,
      result: e.result,
      tokens: e.tokens,
      ingots: e.ingots,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export type BlacksmithView = ReturnType<typeof serialize>;

/** Every blacksmith, plus the characters that could still become one. */
export async function listBlacksmiths() {
  const [rows, candidates] = await Promise.all([
    prisma.blacksmith.findMany({ include, orderBy: { createdAt: "asc" } }),
    prisma.character.findMany({
      where: { blacksmith: { is: null } },
      select: { id: true, displayName: true, owner: { select: { name: true } } },
      orderBy: { displayName: "asc" },
    }),
  ]);
  return {
    blacksmiths: rows.map(serialize),
    candidates: candidates.map((c) => ({ id: c.id, name: c.displayName, owner: c.owner.name })),
  };
}

export async function getBlacksmith(id: string) {
  const row = await prisma.blacksmith.findUnique({ where: { id }, include });
  return row ? serialize(row) : null;
}

export async function createBlacksmith(characterId: string) {
  const row = await prisma.blacksmith.create({ data: { characterId }, include });
  return serialize(row);
}

// Stock and token counts are read, changed and written back, so two people
// recording at once must not both start from the same numbers.
async function lock(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Blacksmith" WHERE id = ${id} FOR UPDATE`;
  return rows.length > 0;
}

export async function updateBlacksmith(
  id: string,
  patch: {
    level?: number;
    tokensSpent?: number;
    tokenDebt?: number;
    /** Merged per metal, so editing one count leaves the others alone. */
    stock?: Counts;
    modifiers?: Counts;
  },
) {
  const found = await prisma.$transaction(async (tx) => {
    if (!(await lock(tx, id))) return false;
    const data: Prisma.BlacksmithUpdateInput = {
      level: patch.level,
      tokensSpent: patch.tokensSpent,
      tokenDebt: patch.tokenDebt,
      modifiers: patch.modifiers,
    };
    if (patch.stock) {
      const current = await tx.blacksmith.findUniqueOrThrow({
        where: { id },
        select: { stock: true },
      });
      data.stock = { ...asCounts(current.stock), ...patch.stock };
    }
    await tx.blacksmith.update({ where: { id }, data });
    return true;
  });
  return found ? getBlacksmith(id) : null;
}

/**
 * Records a craft or repair attempt and spends what it cost. Whether an
 * attempt costs anything, and the weekly token allowance, come from the
 * forge's house rules, which live in the browser; the client checks those.
 * Running out of ingots is checked here because stock is shared.
 */
export async function recordAttempt(
  id: string,
  input: {
    action: string;
    result: string;
    tokens: number;
    ingots: number;
    metal: string;
    /** Charge the tokens to next week's allowance (repairs on the road). */
    nextWeek: boolean;
  },
): Promise<{ error: string } | { blacksmith: BlacksmithView } | null> {
  const outcome = await prisma.$transaction(async (tx) => {
    if (!(await lock(tx, id))) return null;
    const current = await tx.blacksmith.findUniqueOrThrow({
      where: { id },
      select: { stock: true },
    });
    const stock = asCounts(current.stock);
    const onHand = stock[input.metal] ?? 0;
    if (onHand < input.ingots) {
      return { ok: false as const, error: `Not enough ${input.metal} ingots in inventory.` };
    }
    if (input.ingots) stock[input.metal] = onHand - input.ingots;

    await tx.blacksmith.update({
      where: { id },
      data: {
        stock,
        ...(input.nextWeek
          ? { tokenDebt: { increment: input.tokens } }
          : { tokensSpent: { increment: input.tokens } }),
        entries: {
          create: {
            action: input.action,
            result: input.result,
            tokens: input.tokens,
            ingots: input.ingots ? `${input.ingots} ${input.metal}` : "0",
          },
        },
      },
    });
    return { ok: true as const };
  });

  if (!outcome) return null;
  if (!outcome.ok) return { error: outcome.error };
  const blacksmith = await getBlacksmith(id);
  return blacksmith ? { blacksmith } : null;
}

export async function clearHistory(id: string) {
  await prisma.forgeEntry.deleteMany({ where: { blacksmithId: id } });
  return getBlacksmith(id);
}
