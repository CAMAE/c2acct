-- CreateEnum
CREATE TYPE "InviteCodeStatus" AS ENUM ('ACTIVE', 'EXHAUSTED', 'EXPIRED', 'REVOKED');

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "vendorCompanyId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "status" "InviteCodeStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "maxClaims" INTEGER NOT NULL DEFAULT 1,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "launchMode" "SponsorLaunchMode" NOT NULL DEFAULT 'PRIVATE_LAUNCH',
    "productAccessMode" "SponsorProductAccessMode" NOT NULL DEFAULT 'ALL_PRODUCTS',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_codeHash_key" ON "InviteCode"("codeHash");

-- CreateIndex
CREATE INDEX "InviteCode_vendorCompanyId_status_idx" ON "InviteCode"("vendorCompanyId", "status");

-- CreateIndex
CREATE INDEX "InviteCode_createdByUserId_idx" ON "InviteCode"("createdByUserId");

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
