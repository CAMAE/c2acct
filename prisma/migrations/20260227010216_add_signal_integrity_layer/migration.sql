-- AlterTable
ALTER TABLE "SurveySubmission" ADD COLUMN     "integrityFlags" JSONB,
ADD COLUMN     "signalIntegrityScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
