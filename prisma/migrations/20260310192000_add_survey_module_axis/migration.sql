-- Phase 1: add module axis to distinguish self-signal modules from external-review modules.
-- Keep ModuleScope as canonical subject scope.
CREATE TYPE "ModuleAxis" AS ENUM ('SELF', 'EXTERNAL_REVIEW');

ALTER TABLE "SurveyModule"
ADD COLUMN "axis" "ModuleAxis" NOT NULL DEFAULT 'SELF';
