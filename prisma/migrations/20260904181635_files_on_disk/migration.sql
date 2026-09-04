-- AlterTable
ALTER TABLE "StoredFile" ADD COLUMN     "storageKey" TEXT,
ALTER COLUMN "bytes" DROP NOT NULL;
