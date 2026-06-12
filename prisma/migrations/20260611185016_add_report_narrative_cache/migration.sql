/*
  Warnings:

  - You are about to drop the column `tsv` on the `KnowledgeChunk` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "KnowledgeChunk_tsv_idx";

-- AlterTable
ALTER TABLE "BillingCustomer" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BillingInvoice" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "BillingWebhookEvent" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "KnowledgeChunk" DROP COLUMN "tsv";

-- AlterTable
ALTER TABLE "MembershipSubscription" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PilotCohort" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PilotCohortMember" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductAssessmentPlan" ALTER COLUMN "selectedUtilityKeys" DROP DEFAULT,
ALTER COLUMN "generatedQuestionIds" DROP DEFAULT,
ALTER COLUMN "profileQuestionIds" DROP DEFAULT,
ALTER COLUMN "scoredQuestionIds" DROP DEFAULT,
ALTER COLUMN "openEndedQuestionIds" DROP DEFAULT,
ALTER COLUMN "moduleOrder" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "sectionOrder" DROP DEFAULT,
ALTER COLUMN "sectionPlan" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ProductProfile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SurveySection" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ReportNarrative" (
    "id" TEXT NOT NULL,
    "reportKey" TEXT NOT NULL,
    "dataFingerprint" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportNarrative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReportNarrative_reportKey_key" ON "ReportNarrative"("reportKey");

-- RenameIndex
ALTER INDEX "BriefEditChoice_briefId_sectionKey_consultantProfileId_choiceTy" RENAME TO "BriefEditChoice_briefId_sectionKey_consultantProfileId_choi_key";
