-- 16d: per-company re-assessment cadence. Purely additive, zero backfill —
-- absence of a row means system defaults (resolved by lib/cadence.ts).

-- CreateTable
CREATE TABLE "CadenceConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "censusIntervalMonths" INTEGER,
    "censusAnchorMonth" INTEGER,
    "pulseIntervalMonths" INTEGER,
    "pulseRotation" JSONB,
    "setBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CadenceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CadenceConfig_companyId_key" ON "CadenceConfig"("companyId");

-- AddForeignKey
ALTER TABLE "CadenceConfig" ADD CONSTRAINT "CadenceConfig_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
