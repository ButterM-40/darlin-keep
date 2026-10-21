import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { asCounts, updateBlacksmith } from "@/lib/blacksmiths";

function wholeAtLeast(value: unknown, min: number) {
  if (value === undefined) return undefined;
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.max(min, n) : undefined;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  let stock: Record<string, number> | undefined;
  if (body.stock !== undefined) {
    stock = {};
    for (const [metal, n] of Object.entries(asCounts(body.stock))) {
      stock[metal] = Math.max(0, Math.trunc(n));
    }
  }

  const updated = await updateBlacksmith(id, {
    level: wholeAtLeast(body.level, 1),
    tokensSpent: wholeAtLeast(body.tokensSpent, 0),
    tokenDebt: wholeAtLeast(body.tokenDebt, 0),
    stock,
    modifiers: body.modifiers === undefined ? undefined : asCounts(body.modifiers),
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

/** Stops tracking a character as a blacksmith. The character itself stays. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.blacksmith.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
