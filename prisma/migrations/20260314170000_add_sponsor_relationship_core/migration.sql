-- CreateEnum
CREATE TYPE "SponsorRelationshipStatus" AS ENUM ('ACTIVE', 'PAUSED', 'REVOKED');

-- CreateEnum
CREATE TYPE "SponsorLaunchMode" AS ENUM ('PRIVATE_LAUNCH');

-- CreateEnum
CREATE TYPE "SponsorProductAccessMode" AS ENUM ('NONE', 'ALL_PRODUCTS');

-- CreateTable
CREATE TABLE "SponsorRelationship" (
    "id" TEXT NOT NULL,
    "vendorCompanyId" TEXT NOT NULL,
    "firmCompanyId" TEXT NOT NULL,
    "status" "SponsorRelationshipStatus" NOT NULL DEFAULT 'ACTIVE',
    "launchMode" "SponsorLaunchMode" NOT NULL DEFAULT 'PRIVATE_LAUNCH',
    "productAccessMode" "SponsorProductAccessMode" NOT NULL DEFAULT 'NONE',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SponsorRelationship_vendorCompanyId_firmCompanyId_key" ON "SponsorRelationship"("vendorCompanyId", "firmCompanyId");

-- CreateIndex
CREATE INDEX "SponsorRelationship_vendorCompanyId_status_idx" ON "SponsorRelationship"("vendorCompanyId", "status");

-- CreateIndex
CREATE INDEX "SponsorRelationship_firmCompanyId_status_idx" ON "SponsorRelationship"("firmCompanyId", "status");

-- CreateIndex
CREATE INDEX "SponsorRelationship_createdByUserId_idx" ON "SponsorRelationship"("createdByUserId");

-- AddForeignKey
ALTER TABLE "SponsorRelationship" ADD CONSTRAINT "SponsorRelationship_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorRelationship" ADD CONSTRAINT "SponsorRelationship_firmCompanyId_fkey" FOREIGN KEY ("firmCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorRelationship" ADD CONSTRAINT "SponsorRelationship_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
