import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { deleteCharacter, updateCharacter } from "@/lib/characters";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    values?: Record<string, string>;
    ownerId?: string;
    /** updatedAt the client last saw, used to spot a concurrent edit. */
    baseUpdatedAt?: string;
  };

  if (body.baseUpdatedAt && body.values) {
    const current = await prisma.character.findUnique({
      where: { id },
      select: { updatedAt: true },
    });
    if (
      current &&
      current.updatedAt.getTime() > new Date(body.baseUpdatedAt).getTime() + 1000
    ) {
      return NextResponse.json(
        {
          error: "stale",
          message:
            "Someone else saved this character after you opened it. Reload to see their changes.",
          updatedAt: current.updatedAt.toISOString(),
        },
        { status: 409 },
      );
    }
  }

  const updated = await updateCharacter(id, {
    values: body.values,
    ownerId: body.ownerId,
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    displayName: updated.displayName,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await deleteCharacter(id);
  return NextResponse.json({ ok: true });
}
