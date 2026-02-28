-- CreateTable
CREATE TABLE "FirmMaturityMomentum" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "windowN" INTEGER NOT NULL DEFAULT 3,
    "delta1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delta2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trend" TEXT NOT NULL DEFAULT 'FLAT',
    "velocity" TEXT NOT NULL DEFAULT 'STABLE',
    "stability" TEXT NOT NULL DEFAULT 'STABLE',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirmMaturityMomentum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FirmMaturityMomentum_companyId_idx" ON "FirmMaturityMomentum"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "FirmMaturityMomentum_companyId_version_key" ON "FirmMaturityMomentum"("companyId", "version");

-- AddForeignKey
ALTER TABLE "FirmMaturityMomentum" ADD CONSTRAINT "FirmMaturityMomentum_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
