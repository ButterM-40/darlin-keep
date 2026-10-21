-- CreateTable
CREATE TABLE "Blacksmith" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "tokensSpent" INTEGER NOT NULL DEFAULT 0,
    "tokenDebt" INTEGER NOT NULL DEFAULT 0,
    "stock" JSONB NOT NULL DEFAULT '{}',
    "modifiers" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blacksmith_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForgeEntry" (
    "id" TEXT NOT NULL,
    "blacksmithId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "ingots" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForgeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Blacksmith_characterId_key" ON "Blacksmith"("characterId");

-- CreateIndex
CREATE INDEX "ForgeEntry_blacksmithId_createdAt_idx" ON "ForgeEntry"("blacksmithId", "createdAt");

-- AddForeignKey
ALTER TABLE "Blacksmith" ADD CONSTRAINT "Blacksmith_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForgeEntry" ADD CONSTRAINT "ForgeEntry_blacksmithId_fkey" FOREIGN KEY ("blacksmithId") REFERENCES "Blacksmith"("id") ON DELETE CASCADE ON UPDATE CASCADE;

