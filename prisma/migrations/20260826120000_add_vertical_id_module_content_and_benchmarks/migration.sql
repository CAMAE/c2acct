-- Vertical Pack framework PF-2 / W5 — extend the verticalId storage layer to the
-- module-content and benchmark-membership tables
-- (VERTICAL-READINESS-AUDIT-2026-08 §2 class (b), §4 W5/W6).
--
-- ADDITIVE ONLY. Every statement is an ADD COLUMN with a NOT NULL DEFAULT or a
-- CREATE INDEX. No existing table, column, index, constraint, default or type is
-- altered, renamed or dropped, and no row is rewritten by a data migration:
-- ADD COLUMN ... DEFAULT backfills existing rows in place. An older build keeps
-- working unchanged against this schema, because every column it already reads
-- and writes is untouched and every new column has a server-side default.
--
-- The default is 'accounting' for the same reason as the original
-- add_vertical_id_layer migration: every row that exists today was written
-- before any vertical existed, so 'accounting' is the true value, not a
-- placeholder. Pack ids referenced by stored rows are FROZEN (audit §5.4) —
-- renaming the pack is a data migration, never a config edit.
--
-- These columns are INERT with PAT_ENABLE_VERTICAL_PACKS off. The governing
-- invariant (§3.3) is that flag off is byte-identical to today: no query gains a
-- verticalId filter, no write names the column (the server-side default supplies
-- it), and no read plan changes for a default tenant. The columns exist so that
-- the flag-on paths have something true to filter and stamp.

-- Module content (class b): the four Block A/B adaptive-module tables. Content
-- and the history it accrues are per-vertical — an accounting item bank has no
-- meaning inside another vertical's cohort.
ALTER TABLE "ModuleItem" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "ModuleUnlockRule" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "ModuleSitting" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "ItemResponse" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';

-- Survey submissions: the evidence rows every benchmark distribution is computed
-- from. Without the column the cohort isolation invariant (W6) would have to
-- infer a submission's vertical by joining back through Company on every read.
ALTER TABLE "SurveySubmission" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';

-- Benchmark MEMBERSHIP (class b, W6). BenchmarkCohort and BenchmarkRun are
-- deliberately NOT verticalized: a cohort is single-vertical BY CONSTRUCTION,
-- enforced at write time by lib/benchmarkCohortIsolation.ts, which refuses a
-- mixed-vertical contributor set rather than silently filtering it. The
-- membership rows carry the column so that refusal has something to check and
-- so per-vertical suppression counts can be taken without a Company join.
ALTER TABLE "CompanyBenchmark" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "CompanyBenchmarkCohort" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';

CREATE INDEX "ModuleItem_verticalId_idx" ON "ModuleItem"("verticalId");
CREATE INDEX "ModuleUnlockRule_verticalId_idx" ON "ModuleUnlockRule"("verticalId");
CREATE INDEX "ModuleSitting_verticalId_idx" ON "ModuleSitting"("verticalId");
CREATE INDEX "ItemResponse_verticalId_idx" ON "ItemResponse"("verticalId");
CREATE INDEX "SurveySubmission_verticalId_idx" ON "SurveySubmission"("verticalId");
CREATE INDEX "CompanyBenchmark_verticalId_idx" ON "CompanyBenchmark"("verticalId");
CREATE INDEX "CompanyBenchmarkCohort_verticalId_idx" ON "CompanyBenchmarkCohort"("verticalId");
