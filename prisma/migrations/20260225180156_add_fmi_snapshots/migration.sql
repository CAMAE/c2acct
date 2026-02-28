-- CreateTable
CREATE TABLE "FirmMaturitySnapshot" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "bandMin" DOUBLE PRECISION NOT NULL,
    "bandMax" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmMaturitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FirmMaturitySnapshot_companyId_computedAt_idx" ON "FirmMaturitySnapshot"("companyId", "computedAt");

-- CreateIndex
CREATE INDEX "FirmMaturitySnapshot_companyId_version_idx" ON "FirmMaturitySnapshot"("companyId", "version");

-- AddForeignKey
ALTER TABLE "FirmMaturitySnapshot" ADD CONSTRAINT "FirmMaturitySnapshot_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
