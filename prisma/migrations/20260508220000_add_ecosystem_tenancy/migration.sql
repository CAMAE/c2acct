-- Phase 1 — Ecosystem tenancy foundation. PAT 5.7 plan, Day 10.
-- Closes the consultant scope decisions Q3 (strict 1:1) + Q6 (always-on
-- ecosystem-bounded tenancy via PAT_TENANCY_MODE) by introducing the
-- Ecosystem + EcosystemFirm models and repointing ConsultantAssignment
-- away from a direct firm-companyId foreign key onto a strict 1:1
-- ecosystemId foreign key.
--
-- Backfill: existing ConsultantAssignment.companyId values would normally
-- need to be wrapped in solo-firm ecosystems before the column is dropped.
-- Verified live DB at migration time: 0 active ConsultantAssignment rows
-- (the seeded review.consultant@pat.local has no assignments yet). The
-- backfill block below is therefore a defensive no-op for the actual
-- seed; it stays in the migration so a future operator-created assignment
-- (via /admin/consultants before the migration runs) is not silently
-- dropped.

-- 1. Drop the existing direct-firm constraints on ConsultantAssignment.

ALTER TABLE "ConsultantAssignment" DROP CONSTRAINT "ConsultantAssignment_companyId_fkey";

DROP INDEX "ConsultantAssignment_companyId_active_idx";
DROP INDEX "ConsultantAssignment_consultantProfileId_active_idx";
DROP INDEX "ConsultantAssignment_consultantProfileId_companyId_key";

-- 2. Create the new Ecosystem + EcosystemFirm tables.

CREATE TABLE "Ecosystem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vendorCompanyId" TEXT,
    "consultantProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ecosystem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EcosystemFirm" (
    "ecosystemId" TEXT NOT NULL,
    "firmCompanyId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EcosystemFirm_pkey" PRIMARY KEY ("ecosystemId","firmCompanyId")
);

CREATE UNIQUE INDEX "Ecosystem_vendorCompanyId_key" ON "Ecosystem"("vendorCompanyId");
CREATE UNIQUE INDEX "Ecosystem_consultantProfileId_key" ON "Ecosystem"("consultantProfileId");
CREATE INDEX "Ecosystem_vendorCompanyId_idx" ON "Ecosystem"("vendorCompanyId");
CREATE INDEX "Ecosystem_consultantProfileId_idx" ON "Ecosystem"("consultantProfileId");

CREATE UNIQUE INDEX "EcosystemFirm_firmCompanyId_key" ON "EcosystemFirm"("firmCompanyId");
CREATE INDEX "EcosystemFirm_ecosystemId_idx" ON "EcosystemFirm"("ecosystemId");

ALTER TABLE "Ecosystem" ADD CONSTRAINT "Ecosystem_vendorCompanyId_fkey" FOREIGN KEY ("vendorCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ecosystem" ADD CONSTRAINT "Ecosystem_consultantProfileId_fkey" FOREIGN KEY ("consultantProfileId") REFERENCES "ConsultantProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EcosystemFirm" ADD CONSTRAINT "EcosystemFirm_ecosystemId_fkey" FOREIGN KEY ("ecosystemId") REFERENCES "Ecosystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EcosystemFirm" ADD CONSTRAINT "EcosystemFirm_firmCompanyId_fkey" FOREIGN KEY ("firmCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Add ConsultantAssignment.ecosystemId as nullable so the backfill can
--    populate it before we tighten the constraint.

ALTER TABLE "ConsultantAssignment" ADD COLUMN "ecosystemId" TEXT;

-- 4. Backfill: for each existing ConsultantAssignment.companyId, create a
--    "Solo: <firm name>" ecosystem (vendorCompanyId left NULL per Q2 of the
--    Day-10 schema proposal — the orphan vendor is filled in later via the
--    /admin/ecosystems UI in Phase 5). One ecosystem per assignment row,
--    one EcosystemFirm row per assignment row.
--
--    No-op when there are zero ConsultantAssignment rows. Idempotent: the
--    EcosystemFirm UNIQUE on firmCompanyId would block a second migration
--    run with the same firm; this is OK because the migration runs once.

INSERT INTO "Ecosystem" ("id", "name", "vendorCompanyId", "consultantProfileId", "createdAt", "updatedAt")
SELECT
    'eco_solo_' || ca."id",
    'Solo: ' || c."name",
    NULL,
    ca."consultantProfileId",
    NOW(),
    NOW()
FROM "ConsultantAssignment" ca
JOIN "Company" c ON c."id" = ca."companyId"
WHERE ca."active" = true
ON CONFLICT ("consultantProfileId") DO NOTHING;

INSERT INTO "EcosystemFirm" ("ecosystemId", "firmCompanyId", "joinedAt")
SELECT
    'eco_solo_' || ca."id",
    ca."companyId",
    NOW()
FROM "ConsultantAssignment" ca
WHERE ca."active" = true
ON CONFLICT DO NOTHING;

UPDATE "ConsultantAssignment" ca
SET "ecosystemId" = 'eco_solo_' || ca."id"
WHERE ca."active" = true
  AND ca."ecosystemId" IS NULL;

-- 5. Drop any inactive ConsultantAssignment rows that the backfill skipped.
--    Strict-1:1 schema below would otherwise reject these legacy rows on
--    the NOT NULL constraint. Inactive rows are stale by definition.

DELETE FROM "ConsultantAssignment" WHERE "active" = false AND "ecosystemId" IS NULL;

-- 6. Tighten the constraint and drop the old companyId column.

ALTER TABLE "ConsultantAssignment" ALTER COLUMN "ecosystemId" SET NOT NULL;
ALTER TABLE "ConsultantAssignment" DROP COLUMN "companyId";

CREATE UNIQUE INDEX "ConsultantAssignment_consultantProfileId_key" ON "ConsultantAssignment"("consultantProfileId");
CREATE UNIQUE INDEX "ConsultantAssignment_ecosystemId_key" ON "ConsultantAssignment"("ecosystemId");
CREATE INDEX "ConsultantAssignment_consultantProfileId_idx" ON "ConsultantAssignment"("consultantProfileId");
CREATE INDEX "ConsultantAssignment_ecosystemId_idx" ON "ConsultantAssignment"("ecosystemId");

ALTER TABLE "ConsultantAssignment" ADD CONSTRAINT "ConsultantAssignment_ecosystemId_fkey" FOREIGN KEY ("ecosystemId") REFERENCES "Ecosystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
