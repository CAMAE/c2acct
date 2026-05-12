-- AlterTable
ALTER TABLE "ProductAssessmentPlan"
ADD COLUMN "sectionOrder" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "sectionPlan" JSONB NOT NULL DEFAULT '[]'::jsonb;

-- CreateTable
CREATE TABLE "SurveySection" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "utilityFamily" TEXT,
    "utilityKey" TEXT,
    "utilityLabel" TEXT,
    "subcategoryKey" TEXT,
    "subcategoryTitle" TEXT,
    "basisKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveySection_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "SurveyQuestion"
ADD COLUMN "sectionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "SurveySection_moduleId_key_key" ON "SurveySection"("moduleId", "key");

-- CreateIndex
CREATE INDEX "SurveySection_moduleId_order_idx" ON "SurveySection"("moduleId", "order");

-- CreateIndex
CREATE INDEX "SurveyQuestion_moduleId_order_idx" ON "SurveyQuestion"("moduleId", "order");

-- CreateIndex
CREATE INDEX "SurveyQuestion_sectionId_order_idx" ON "SurveyQuestion"("sectionId", "order");

-- AddForeignKey
ALTER TABLE "SurveySection" ADD CONSTRAINT "SurveySection_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SurveyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestion" ADD CONSTRAINT "SurveyQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SurveySection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
