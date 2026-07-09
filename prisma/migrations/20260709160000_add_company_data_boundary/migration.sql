-- Data-integrity boundary (2026-07-09 audit, CLASS 1 — launch-blocking).
-- Additive only: one column + one index on Company, then a backfill that
-- classifies existing rows so demo/synthetic data can be filtered out of every
-- customer-facing aggregate. New rows default to PRODUCTION; the demo/pilot
-- seeds set DEMO/PILOT explicitly so a db:recreate + reseed stays classified.

-- 1. Column (default PRODUCTION = real customer data).
ALTER TABLE "Company" ADD COLUMN "dataBoundary" "DataBoundary" NOT NULL DEFAULT 'PRODUCTION';

-- 2. Index for boundary-scoped aggregate queries.
CREATE INDEX "Company_type_dataBoundary_idx" ON "Company"("type", "dataBoundary");

-- 3. Backfill — DEMO by id namespace (demo-firm-company-, demo-vendor-company-,
--    demo-bench-firm-, demo-expand-firm-, demo-expand-vendor-, demo-elite-*).
UPDATE "Company" SET "dataBoundary" = 'DEMO' WHERE "id" LIKE 'demo-%';

-- 4. Backfill — DEMO by linked-user email domain (catch anything the id misses:
--    local-review review.* accounts, demo-bench / demo-expand firm users, legacy
--    @patalign.test test accounts).
UPDATE "Company" SET "dataBoundary" = 'DEMO'
WHERE "id" IN (
  SELECT DISTINCT "companyId" FROM "User"
  WHERE "companyId" IS NOT NULL AND (
    "email" LIKE '%@demo-bench.pat.local' OR
    "email" LIKE '%@demo-expand.pat.local' OR
    "email" LIKE '%@patalign.test' OR
    "email" LIKE 'review.%@pat.local' OR
    "email" LIKE 'demo-%@pat.local'
  )
);

-- 5. Backfill — PILOT by id namespace (pilot-company-*).
UPDATE "Company" SET "dataBoundary" = 'PILOT' WHERE "id" LIKE 'pilot-company-%';

-- 6. Backfill — PILOT by cohort membership (authoritative), never overriding DEMO.
UPDATE "Company" c SET "dataBoundary" = 'PILOT'
FROM "PilotCohortMember" m
WHERE m."companyId" = c."id" AND m."dataBoundary" = 'PILOT' AND c."dataBoundary" <> 'DEMO';
