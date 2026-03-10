-- CreateEnum
CREATE TYPE "ExternalReviewStatus" AS ENUM ('SUBMITTED', 'FINALIZED', 'REJECTED');

-- CreateTable
CREATE TABLE "ExternalReviewSubmission" (
    "id" TEXT NOT NULL,
    "reviewerCompanyId" TEXT NOT NULL,
    "subjectCompanyId" TEXT NOT NULL,
    "subjectProductId" TEXT,
    "moduleId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "normalizedDimensions" JSONB,
    "score" INTEGER,
    "weightedAvg" DOUBLE PRECISION,
    "scoreVersion" INTEGER,
    "signalIntegrityScore" DOUBLE PRECISION,
    "integrityFlags" JSONB,
    "reviewStatus" "ExternalReviewStatus" NOT NULL DEFAULT 'SUBMITTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalReviewSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalReviewSubmission_reviewerCompanyId_createdAt_idx" ON "ExternalReviewSubmission"("reviewerCompanyId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalReviewSubmission_subjectCompanyId_subjectProductId__idx" ON "ExternalReviewSubmission"("subjectCompanyId", "subjectProductId", "moduleId", "createdAt");

-- CreateIndex
CREATE INDEX "ExternalReviewSubmission_moduleId_reviewStatus_createdAt_idx" ON "ExternalReviewSubmission"("moduleId", "reviewStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "ExternalReviewSubmission" ADD CONSTRAINT "ExternalReviewSubmission_reviewerCompanyId_fkey" FOREIGN KEY ("reviewerCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReviewSubmission" ADD CONSTRAINT "ExternalReviewSubmission_subjectCompanyId_fkey" FOREIGN KEY ("subjectCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReviewSubmission" ADD CONSTRAINT "ExternalReviewSubmission_subjectProductId_fkey" FOREIGN KEY ("subjectProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalReviewSubmission" ADD CONSTRAINT "ExternalReviewSubmission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SurveyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
