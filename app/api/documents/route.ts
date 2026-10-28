import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/db";
import { getCurrentCampaign } from "@/lib/campaigns";
import { MAX_UPLOAD_BYTES, formatBytes, isDocKind, normalizeUrl } from "@/lib/documents";
import { putFile } from "@/lib/storage";

/**
 * Creates a document. Uploads go through a route handler rather than a server
 * action because server actions cap request bodies at 1 MB by default.
 */
export async function POST(request: Request) {
  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const note = String(form.get("note") ?? "").trim() || null;
  const ownerId = String(form.get("ownerId") ?? "") || null;
  // Filed under the campaign this browser is on, unless it is for everyone.
  const campaignId = form.get("shared") === "on" ? null : (await getCurrentCampaign()).id;

  if (!isDocKind(kind)) {
    return NextResponse.json({ error: "Pick a document type." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Give it a title." }, { status: 400 });
  }

  try {
    if (kind === "LINK") {
      const url = normalizeUrl(String(form.get("url") ?? ""));
      if (!url) {
        return NextResponse.json(
          { error: "That does not look like a web address." },
          { status: 400 },
        );
      }
      const doc = await prisma.document.create({
        data: { kind, title, note, ownerId, campaignId, url },
      });
      return NextResponse.json({ id: doc.id });
    }

    if (kind === "BOARD") {
      const doc = await prisma.document.create({
        data: { kind, title, note, ownerId, campaignId },
      });
      return NextResponse.json({ id: doc.id });
    }

    // PDF
    const file = form.get("pdf");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose a PDF." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `That PDF is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_UPLOAD_BYTES)}.`,
        },
        { status: 400 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    // Page sizes are read now so the viewer can lay out before the PDF loads.
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const pageSizes = pdf
      .getPages()
      .map((p) => ({ width: p.getWidth(), height: p.getHeight() }));

    const stored = await putFile({
      bytes,
      mimeType: "application/pdf",
      fileName: file.name || "document.pdf",
    });

    const doc = await prisma.document.create({
      data: {
        kind,
        title,
        note,
        ownerId,
        campaignId,
        fileId: stored.id,
        pageCount: pageSizes.length,
        pageSizes,
      },
    });
    return NextResponse.json({ id: doc.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "That document could not be created.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
