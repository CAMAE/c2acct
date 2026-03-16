ALTER TABLE "CompanyCapabilityScore"
ADD COLUMN "productId" TEXT,
ADD COLUMN "moduleId" TEXT,
ADD COLUMN "sourceType" "UnlockEvidenceSourceType",
ADD COLUMN "surveySubmissionId" TEXT,
ADD COLUMN "externalObservedSignalRollupId" TEXT;

UPDATE "CompanyCapabilityScore" AS ccs
SET
  "moduleId" = sm."id",
  "sourceType" = 'SELF_SUBMISSION'
FROM "SurveyModule" AS sm
WHERE sm."key" = 'firm_alignment_v1'
  AND ccs."moduleId" IS NULL;

ALTER TABLE "CompanyCapabilityScore"
ALTER COLUMN "moduleId" SET NOT NULL,
ALTER COLUMN "sourceType" SET NOT NULL;

DROP INDEX IF EXISTS "CompanyCapabilityScore_companyId_nodeId_scoreVersion_key";

CREATE INDEX "CompanyCapabilityScore_companyId_productId_idx" ON "CompanyCapabilityScore"("companyId", "productId");
CREATE INDEX "CompanyCapabilityScore_moduleId_idx" ON "CompanyCapabilityScore"("moduleId");
CREATE INDEX "CompanyCapabilityScore_surveySubmissionId_idx" ON "CompanyCapabilityScore"("surveySubmissionId");
CREATE INDEX "CompanyCapabilityScore_externalObservedSignalRollupId_idx" ON "CompanyCapabilityScore"("externalObservedSignalRollupId");
CREATE UNIQUE INDEX "CompanyCapabilityScore_companyId_productId_moduleId_nodeId_scoreVersion_sourceType_key"
ON "CompanyCapabilityScore"("companyId", "productId", "moduleId", "nodeId", "scoreVersion", "sourceType");

ALTER TABLE "CompanyCapabilityScore"
ADD CONSTRAINT "CompanyCapabilityScore_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyCapabilityScore"
ADD CONSTRAINT "CompanyCapabilityScore_moduleId_fkey"
FOREIGN KEY ("moduleId") REFERENCES "SurveyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyCapabilityScore"
ADD CONSTRAINT "CompanyCapabilityScore_surveySubmissionId_fkey"
FOREIGN KEY ("surveySubmissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyCapabilityScore"
ADD CONSTRAINT "CompanyCapabilityScore_externalObservedSignalRollupId_fkey"
FOREIGN KEY ("externalObservedSignalRollupId") REFERENCES "ExternalObservedSignalRollup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
