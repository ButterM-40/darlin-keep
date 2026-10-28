"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { rememberCampaign } from "@/lib/campaigns";

type Result = { ok: true } | { ok: false; error: string };

// The header names the current campaign on every page, so any change here
// re-renders the whole tree.
function refreshAll() {
  revalidatePath("/", "layout");
}

function cleanName(raw: string): string {
  return raw.trim().replace(/\s+/g, " ").slice(0, 60);
}

function nameTaken(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

/** Points this browser at another campaign. */
export async function switchCampaign(id: string) {
  const exists = await prisma.campaign.count({ where: { id } });
  if (!exists) return;
  await rememberCampaign(id);
  refreshAll();
}

/** Starts a campaign with an empty roster and switches this browser to it. */
export async function createCampaign(rawName: string): Promise<Result> {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: "Give the campaign a name." };

  try {
    const campaign = await prisma.campaign.create({ data: { name }, select: { id: true } });
    await rememberCampaign(campaign.id);
  } catch (error) {
    if (nameTaken(error)) return { ok: false, error: `There is already a campaign called ${name}.` };
    throw error;
  }
  refreshAll();
  return { ok: true };
}

export async function renameCampaign(id: string, rawName: string): Promise<Result> {
  const name = cleanName(rawName);
  if (!name) return { ok: false, error: "Give the campaign a name." };

  try {
    await prisma.campaign.update({ where: { id }, data: { name } });
  } catch (error) {
    if (nameTaken(error)) return { ok: false, error: `There is already a campaign called ${name}.` };
    throw error;
  }
  refreshAll();
  return { ok: true };
}

/**
 * Deletes a campaign but nothing in it: characters keep their sheets and can
 * be brought into another campaign, and its documents become shared by every
 * campaign rather than disappearing.
 */
export async function deleteCampaign(id: string): Promise<Result> {
  const count = await prisma.campaign.count();
  if (count <= 1) return { ok: false, error: "The last campaign can't be deleted." };

  await prisma.campaign.deleteMany({ where: { id } });
  // A browser still pointing here falls back to the oldest campaign on read.
  refreshAll();
  return { ok: true };
}
