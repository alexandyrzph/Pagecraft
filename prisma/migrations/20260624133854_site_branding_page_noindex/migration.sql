-- AlterTable
ALTER TABLE "Page" ADD COLUMN     "noindex" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "logoUrl" TEXT;
