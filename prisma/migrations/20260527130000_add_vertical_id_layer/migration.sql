-- Vertical Pack v1 — parameterize the descriptive/vertical-specific tables with
-- verticalId (Blueprint §6 move (a)+(b): vertical_id as a first-class column;
-- externalize the vendor taxonomy keyed by vertical). Accounting is V1; default
-- 'accounting' backfills every existing row.
--
-- Scope: descriptive + root entities that carry industry assumptions
-- (categories, content, scoring structure roots). Purely structural/derived
-- tables (User, scores, agent_*, sessions) are NOT verticalized — they inherit
-- context from their parent Company/Product or are vertical-agnostic.
--
-- NOTE: the spec referenced an AccountingTaxonomyNode table to rename; no such
-- table exists. The real externalized taxonomy is TaxonomyBucket, which is
-- verticalized here directly (no rename).
--
-- Additive only: ADD COLUMN ... DEFAULT backfills existing rows in place.

ALTER TABLE "Badge" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "BadgeRule" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "CompanyBadge" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "Company" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "Insight" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "InsightUnlockRule" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "Product" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "SurveyModule" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "SurveyQuestion" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "TaxonomyBucket" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';
ALTER TABLE "VendorProfile" ADD COLUMN "verticalId" TEXT NOT NULL DEFAULT 'accounting';

CREATE INDEX "Badge_verticalId_idx" ON "Badge"("verticalId");
CREATE INDEX "BadgeRule_verticalId_idx" ON "BadgeRule"("verticalId");
CREATE INDEX "CompanyBadge_verticalId_idx" ON "CompanyBadge"("verticalId");
CREATE INDEX "Company_verticalId_idx" ON "Company"("verticalId");
CREATE INDEX "Insight_verticalId_idx" ON "Insight"("verticalId");
CREATE INDEX "InsightUnlockRule_verticalId_idx" ON "InsightUnlockRule"("verticalId");
CREATE INDEX "Product_verticalId_idx" ON "Product"("verticalId");
CREATE INDEX "SurveyModule_verticalId_idx" ON "SurveyModule"("verticalId");
CREATE INDEX "SurveyQuestion_verticalId_idx" ON "SurveyQuestion"("verticalId");
CREATE INDEX "TaxonomyBucket_verticalId_kind_idx" ON "TaxonomyBucket"("verticalId", "kind");
CREATE INDEX "VendorProfile_verticalId_idx" ON "VendorProfile"("verticalId");
