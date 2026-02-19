-- Backfill scoring contract fields for existing rows (Postgres)
UPDATE "SurveySubmission"
SET
  "score" = COALESCE("score", 0),
  "scoreVersion" = COALESCE("scoreVersion", 1),
  "scaleMin" = COALESCE("scaleMin", 0),
  "scaleMax" = COALESCE("scaleMax", 5),
  "totalWeight" = COALESCE("totalWeight", 0),
  "answeredCount" = COALESCE("answeredCount", 0),
  "version" = COALESCE("version", 1);

-- Keep weightedAvg nullable (allowed when answeredCount=0); but if it’s null and answeredCount>0, set it to 0 as a safe fallback
UPDATE "SurveySubmission"
SET "weightedAvg" = 0
WHERE "weightedAvg" IS NULL AND COALESCE("answeredCount",0) > 0;
