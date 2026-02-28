-- DropIndex
DROP INDEX "SurveyQuestion_moduleId_idx";

-- DropIndex
DROP INDEX "SurveyQuestion_moduleId_key_key";

-- CreateTable
CREATE TABLE "CompanyBadge" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "moduleId" TEXT,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBadge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyBadge_companyId_idx" ON "CompanyBadge"("companyId");

-- CreateIndex
CREATE INDEX "CompanyBadge_badgeId_idx" ON "CompanyBadge"("badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBadge_companyId_badgeId_key" ON "CompanyBadge"("companyId", "badgeId");

-- AddForeignKey
ALTER TABLE "CompanyBadge" ADD CONSTRAINT "CompanyBadge_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBadge" ADD CONSTRAINT "CompanyBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
