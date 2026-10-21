import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { BODY_MAX, TITLE_MAX, toNotebookView } from "@/lib/notebooks";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: unknown;
    body?: unknown;
    /** updatedAt the client last saw, used to spot a concurrent edit. */
    baseUpdatedAt?: string;
  };

  const current = await prisma.notebook.findUnique({
    where: { id },
    select: { updatedAt: true },
  });
  if (!current) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    body.baseUpdatedAt &&
    current.updatedAt.getTime() > new Date(body.baseUpdatedAt).getTime() + 1000
  ) {
    return NextResponse.json(
      {
        error: "stale",
        message:
          "Someone else saved this notebook after you opened it. Reload to see their changes.",
      },
      { status: 409 },
    );
  }

  const text = typeof body.body === "string" ? body.body : undefined;
  if (text !== undefined && text.length > BODY_MAX) {
    return NextResponse.json(
      { error: "too-long", message: "This notebook is too long to save. Split it into two." },
      { status: 413 },
    );
  }

  const updated = await prisma.notebook.update({
    where: { id },
    data: {
      title: typeof body.title === "string" ? body.title.slice(0, TITLE_MAX) : undefined,
      body: text,
    },
  });
  return NextResponse.json(toNotebookView(updated));
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  await prisma.notebook.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
