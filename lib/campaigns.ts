import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Which campaign this browser is looking at. It only filters the list pages
 * (roster, documents, forge); anything opened by id works from any campaign.
 */
export const CAMPAIGN_COOKIE = "dk-campaign";

export interface CampaignOption {
  id: string;
  name: string;
}

export async function listCampaigns(): Promise<CampaignOption[]> {
  return prisma.campaign.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
}

/**
 * The campaign named by this browser's cookie, or the oldest one when the
 * cookie is missing or names a campaign that was deleted. There is always at
 * least one: the migration creates it and the last one cannot be deleted, but
 * an empty table still gets one rather than a page that cannot render.
 */
export async function getCurrentCampaign(): Promise<CampaignOption> {
  const [campaigns, jar] = await Promise.all([listCampaigns(), cookies()]);
  const chosen = jar.get(CAMPAIGN_COOKIE)?.value;
  const current = campaigns.find((c) => c.id === chosen) ?? campaigns[0];
  if (current) return current;

  return prisma.campaign.upsert({
    where: { name: "First campaign" },
    update: {},
    create: { name: "First campaign" },
    select: { id: true, name: true },
  });
}

export async function rememberCampaign(id: string) {
  (await cookies()).set(CAMPAIGN_COOKIE, id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
    sameSite: "lax",
  });
}
