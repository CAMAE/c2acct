/*
  Warnings:

  - A unique constraint covering the columns `[companyId,productId,badgeId,moduleId]` on the table `CompanyBadge` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CompanyBadge_companyId_badgeId_moduleId_key";

-- AlterTable
ALTER TABLE "CompanyBadge" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE INDEX "CompanyBadge_companyId_productId_badgeId_idx" ON "CompanyBadge"("companyId", "productId", "badgeId");

-- CreateIndex
CREATE INDEX "CompanyBadge_companyId_productId_awardedAt_idx" ON "CompanyBadge"("companyId", "productId", "awardedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBadge_companyId_productId_badgeId_moduleId_key" ON "CompanyBadge"("companyId", "productId", "badgeId", "moduleId");

-- AddForeignKey
ALTER TABLE "CompanyBadge" ADD CONSTRAINT "CompanyBadge_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
