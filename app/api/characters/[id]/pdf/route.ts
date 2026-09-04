import { renderCharacterPdf } from "@/lib/characters";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const url = new URL(request.url);
  const flatten = url.searchParams.get("flatten") === "1";
  const download = url.searchParams.get("download") === "1";

  const result = await renderCharacterPdf(id, flatten);
  if (!result) return new Response("Not found", { status: 404 });

  const safeName = result.displayName.replace(/[^\w. -]+/g, "_") || "character";
  return new Response(new Uint8Array(result.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
