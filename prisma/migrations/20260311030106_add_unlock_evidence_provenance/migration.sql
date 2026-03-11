-- CreateEnum
CREATE TYPE "UnlockEvidenceSourceType" AS ENUM ('SELF_SUBMISSION', 'EXTERNAL_REVIEW_ROLLUP');

-- CreateTable
CREATE TABLE "UnlockEvidence" (
    "id" TEXT NOT NULL,
    "companyBadgeId" TEXT NOT NULL,
    "sourceType" "UnlockEvidenceSourceType" NOT NULL,
    "surveySubmissionId" TEXT,
    "externalObservedSignalRollupId" TEXT,
    "ruleKey" TEXT NOT NULL,
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnlockEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UnlockEvidence_companyBadgeId_createdAt_idx" ON "UnlockEvidence"("companyBadgeId", "createdAt");

-- CreateIndex
CREATE INDEX "UnlockEvidence_surveySubmissionId_idx" ON "UnlockEvidence"("surveySubmissionId");

-- CreateIndex
CREATE INDEX "UnlockEvidence_externalObservedSignalRollupId_idx" ON "UnlockEvidence"("externalObservedSignalRollupId");

-- AddForeignKey
ALTER TABLE "UnlockEvidence" ADD CONSTRAINT "UnlockEvidence_companyBadgeId_fkey" FOREIGN KEY ("companyBadgeId") REFERENCES "CompanyBadge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockEvidence" ADD CONSTRAINT "UnlockEvidence_surveySubmissionId_fkey" FOREIGN KEY ("surveySubmissionId") REFERENCES "SurveySubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockEvidence" ADD CONSTRAINT "UnlockEvidence_externalObservedSignalRollupId_fkey" FOREIGN KEY ("externalObservedSignalRollupId") REFERENCES "ExternalObservedSignalRollup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
