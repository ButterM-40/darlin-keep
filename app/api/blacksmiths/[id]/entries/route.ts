import { NextResponse } from "next/server";
import { clearHistory, recordAttempt } from "@/lib/blacksmiths";

/** Records a craft or repair attempt and spends its tokens and ingots. */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as Record<string, unknown>;

  const action = String(body.action ?? "").trim().slice(0, 200);
  const result = String(body.result ?? "").trim().slice(0, 200);
  const metal = String(body.metal ?? "").trim().slice(0, 100);
  const tokens = Math.max(0, Math.trunc(Number(body.tokens) || 0));
  const ingots = Math.max(0, Math.trunc(Number(body.ingots) || 0));
  if (!action || !result || (ingots && !metal)) {
    return NextResponse.json({ error: "Incomplete attempt." }, { status: 400 });
  }

  const outcome = await recordAttempt(id, {
    action,
    result,
    tokens,
    ingots,
    metal,
    nextWeek: body.nextWeek === true,
  });

  if (!outcome) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if ("error" in outcome) {
    return NextResponse.json({ error: outcome.error }, { status: 409 });
  }
  return NextResponse.json(outcome.blacksmith);
}

/** Clears a blacksmith's attempt history. Stock and tokens are untouched. */
export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const updated = await clearHistory(id);
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}
