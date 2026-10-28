-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "portraitFileId" TEXT;

-- CreateTable
CREATE TABLE "Theme" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mood" TEXT NOT NULL DEFAULT '',
    "mode" TEXT NOT NULL,
    "font" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "season" JSONB,
    "effects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Theme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartySettings" (
    "id" TEXT NOT NULL DEFAULT 'party',
    "themeId" TEXT NOT NULL DEFAULT 'ember-hearth',
    "seasonal" BOOLEAN NOT NULL DEFAULT true,
    "cardStyle" TEXT NOT NULL DEFAULT 'banner',

    CONSTRAINT "PartySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_portraitFileId_fkey" FOREIGN KEY ("portraitFileId") REFERENCES "StoredFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
