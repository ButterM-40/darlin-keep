import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentCampaign } from "@/lib/campaigns";
import { createBlacksmith, listBlacksmiths } from "@/lib/blacksmiths";

export async function GET() {
  return NextResponse.json(await listBlacksmiths((await getCurrentCampaign()).id));
}

/** Makes an existing character a blacksmith. */
export async function POST(request: Request) {
  const body = (await request.json()) as { characterId?: string };
  const characterId = String(body.characterId ?? "");

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { blacksmith: { select: { id: true } } },
  });
  if (!character) {
    return NextResponse.json({ error: "Pick a character." }, { status: 400 });
  }
  if (character.blacksmith) {
    return NextResponse.json(
      { error: "That character is already a blacksmith." },
      { status: 409 },
    );
  }

  return NextResponse.json(await createBlacksmith(characterId));
}
