/*
  Warnings:

  - A unique constraint covering the columns `[companyId,badgeId,moduleId]` on the table `CompanyBadge` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CompanyBadge_companyId_badgeId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBadge_companyId_badgeId_moduleId_key" ON "CompanyBadge"("companyId", "badgeId", "moduleId");
