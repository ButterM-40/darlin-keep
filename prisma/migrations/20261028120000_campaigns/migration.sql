-- Campaigns. Everything already here becomes the first campaign, with each
-- character keeping the roster row it was in, so nothing moves.

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignMember" (
    "campaignId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'ALIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMember_pkey" PRIMARY KEY ("campaignId","characterId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_name_key" ON "Campaign"("name");

-- CreateIndex
CREATE INDEX "CampaignMember_characterId_idx" ON "CampaignMember"("characterId");

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignMember" ADD CONSTRAINT "CampaignMember_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "Document_campaignId_idx" ON "Document"("campaignId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one campaign holding every character and document.
INSERT INTO "Campaign" ("id", "name") VALUES ('first-campaign', 'First campaign');

INSERT INTO "CampaignMember" ("campaignId", "characterId", "status", "joinedAt")
SELECT 'first-campaign', "id", "status", "createdAt" FROM "Character";

UPDATE "Document" SET "campaignId" = 'first-campaign';

-- Status now lives on CampaignMember.
DROP INDEX "Character_status_idx";
ALTER TABLE "Character" DROP COLUMN "status";
