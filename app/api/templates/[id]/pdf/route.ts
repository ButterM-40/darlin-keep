import { prisma } from "@/lib/db";

/** Serves the blank sheet that the editor renders as its background. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const template = await prisma.template.findUnique({
    where: { id },
    select: { pdf: true },
  });
  if (!template) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(template.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // Templates are immutable once uploaded, so this can cache hard.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
