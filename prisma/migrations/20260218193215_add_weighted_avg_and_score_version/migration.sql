/*
  Warnings:

  - You are about to drop the column `productId` on the `SurveySubmission` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SurveySubmission` table. All the data in the column will be lost.
  - You are about to alter the column `score` on the `SurveySubmission` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - Made the column `score` on table `SurveySubmission` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "SurveySubmission" DROP CONSTRAINT "SurveySubmission_companyId_fkey";

-- DropForeignKey
ALTER TABLE "SurveySubmission" DROP CONSTRAINT "SurveySubmission_moduleId_fkey";

-- DropForeignKey
ALTER TABLE "SurveySubmission" DROP CONSTRAINT "SurveySubmission_productId_fkey";

-- DropIndex
DROP INDEX "SurveySubmission_companyId_idx";

-- DropIndex
DROP INDEX "SurveySubmission_moduleId_idx";

-- DropIndex
DROP INDEX "SurveySubmission_productId_idx";

-- AlterTable
ALTER TABLE "SurveySubmission" DROP COLUMN "productId",
DROP COLUMN "updatedAt",
ADD COLUMN     "scoreVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "weightedAvg" DOUBLE PRECISION,
ALTER COLUMN "score" SET NOT NULL,
ALTER COLUMN "score" SET DATA TYPE INTEGER;

-- CreateIndex
CREATE INDEX "SurveySubmission_companyId_moduleId_createdAt_idx" ON "SurveySubmission"("companyId", "moduleId", "createdAt");

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SurveyModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
