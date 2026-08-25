-- Adaptive modules Block A: the sitting container + per-item response history.
--
-- Strictly additive: one new enum, two new tables, their indexes and foreign
-- keys. No existing table, column, index, or constraint is altered or dropped,
-- so an older build keeps working unchanged against this schema.
--
-- Deletion policy is deliberate and asymmetric (see schema.prisma):
--   CASCADE  from Company (tenant deletion) and ModuleSitting → ItemResponse.
--   RESTRICT on ItemResponse.itemId and ModuleSitting.templateId — the two
--   history edges. A content cleanup must never be able to delete the
--   calibration history these rows exist to accumulate.

-- CreateEnum
CREATE TYPE "ModuleSittingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'ABANDONED');

-- CreateTable
CREATE TABLE "ModuleSitting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "subjectId" TEXT,
    "userId" TEXT,
    "engagementQuarterId" TEXT,
    "servedItemIds" JSONB NOT NULL,
    "status" "ModuleSittingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "scoreRaw" INTEGER,
    "scorePercent" DOUBLE PRECISION,
    "scoreVersion" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ModuleSitting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemResponse" (
    "id" TEXT NOT NULL,
    "sittingId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "responseKey" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,
    "itemRevisionAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ModuleSitting_companyId_templateId_startedAt_idx" ON "ModuleSitting"("companyId", "templateId", "startedAt");

-- CreateIndex
CREATE INDEX "ModuleSitting_templateId_status_idx" ON "ModuleSitting"("templateId", "status");

-- CreateIndex
CREATE INDEX "ItemResponse_itemId_isCorrect_idx" ON "ItemResponse"("itemId", "isCorrect");

-- CreateIndex
CREATE INDEX "ItemResponse_companyId_answeredAt_idx" ON "ItemResponse"("companyId", "answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ItemResponse_sittingId_itemId_key" ON "ItemResponse"("sittingId", "itemId");

-- AddForeignKey
ALTER TABLE "ModuleSitting" ADD CONSTRAINT "ModuleSitting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleSitting" ADD CONSTRAINT "ModuleSitting_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ModuleTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemResponse" ADD CONSTRAINT "ItemResponse_sittingId_fkey" FOREIGN KEY ("sittingId") REFERENCES "ModuleSitting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemResponse" ADD CONSTRAINT "ItemResponse_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ModuleItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
