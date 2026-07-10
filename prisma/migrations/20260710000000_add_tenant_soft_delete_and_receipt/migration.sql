-- Tenant lifecycle (Governance Phase 2, A8/B1). Additive only.
-- 1. Soft-delete tombstone columns on Company. A tenant is soft-deleted first
--    (deletedAt set), retained for the RETENTION window, then hard-purged by
--    scripts/ops/delete-tenant.ts. New rows default to non-deleted (NULL).
ALTER TABLE "Company" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Company" ADD COLUMN "deletionReason" TEXT;

-- 2. Partial-friendly index for excluding soft-deleted rows from read paths.
CREATE INDEX "Company_deletedAt_idx" ON "Company"("deletedAt");

-- 3. Deletion-receipt tombstone table. Deliberately NOT foreign-keyed to Company
--    so the receipt survives a hard purge (it is the proof the tenant existed).
CREATE TABLE "TenantDeletionReceipt" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyType" TEXT NOT NULL,
    "dataBoundary" TEXT NOT NULL,
    "requestedBy" TEXT,
    "reason" TEXT,
    "mode" TEXT NOT NULL,
    "recordCounts" JSONB NOT NULL,
    "externalTouchpoints" JSONB NOT NULL,
    "softDeletedAt" TIMESTAMP(3),
    "hardDeletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantDeletionReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TenantDeletionReceipt_companyId_createdAt_idx" ON "TenantDeletionReceipt"("companyId", "createdAt");
CREATE INDEX "TenantDeletionReceipt_mode_createdAt_idx" ON "TenantDeletionReceipt"("mode", "createdAt");
