-- Assessment item responses (MC redesign box, Prerequisite Zero).
--
-- ADDITIVE ONLY. One new table, its indexes and one foreign key. No existing
-- table, column, index, constraint, default or type is altered, renamed or
-- dropped, and no row is rewritten. SurveySubmission.answers keeps being written
-- exactly as before; this table is written BESIDE it (dual-write) and can be
-- backfilled from it (scripts/assessment/backfill-item-responses.ts).
--
-- One row per selected follow-up option (SINGLE/MULTI), one per scored 0-5 item
-- (SCORED, numericValue), one per legacy free-text follow-up (TEXT, otherText),
-- so a firm module submission is fully represented row-wise. optionKey is the
-- stable registry slug (e.g. ops.q1.a); "Not a significant issue here" and
-- "Other" rows carry <module>.q<n>.none / .other and are excluded from every
-- aggregate by lib/assessment/firmFollowUpOptions.ts.
--
-- Named AssessmentItemResponse: ItemResponse already exists for the quiz-style
-- firm knowledge modules (ModuleSitting / ModuleItem).

-- CreateTable
CREATE TABLE "AssessmentItemResponse" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionVersion" INTEGER NOT NULL,
    "optionSetVersion" INTEGER,
    "selectionMode" TEXT NOT NULL,
    "optionKey" TEXT,
    "otherText" TEXT,
    "numericValue" INTEGER,
    "orderingSeed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentItemResponse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssessmentItemResponse_submissionId_idx" ON "AssessmentItemResponse"("submissionId");

-- CreateIndex
CREATE INDEX "AssessmentItemResponse_companyId_moduleKey_questionKey_idx" ON "AssessmentItemResponse"("companyId", "moduleKey", "questionKey");

-- CreateIndex
CREATE INDEX "AssessmentItemResponse_questionKey_optionKey_idx" ON "AssessmentItemResponse"("questionKey", "optionKey");

-- AddForeignKey
ALTER TABLE "AssessmentItemResponse" ADD CONSTRAINT "AssessmentItemResponse_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
