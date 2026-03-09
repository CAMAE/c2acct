-- AlterTable
ALTER TABLE "SurveySubmission" ADD COLUMN     "productId" TEXT;

-- CreateIndex
CREATE INDEX "SurveySubmission_companyId_productId_moduleId_createdAt_idx" ON "SurveySubmission"("companyId", "productId", "moduleId", "createdAt");

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
