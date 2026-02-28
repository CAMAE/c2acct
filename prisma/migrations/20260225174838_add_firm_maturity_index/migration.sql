-- CreateTable
CREATE TABLE "FirmMaturityIndex" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmMaturityIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FirmMaturityIndex_companyId_idx" ON "FirmMaturityIndex"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FirmMaturityIndex_companyId_version_key" ON "FirmMaturityIndex"("companyId", "version");

-- AddForeignKey
ALTER TABLE "FirmMaturityIndex" ADD CONSTRAINT "FirmMaturityIndex_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
