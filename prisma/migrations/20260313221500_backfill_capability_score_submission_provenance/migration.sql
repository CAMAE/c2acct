WITH ranked_matches AS (
  SELECT
    ccs."id" AS capability_score_id,
    ss."id" AS survey_submission_id,
    ROW_NUMBER() OVER (
      PARTITION BY ccs."id"
      ORDER BY ss."createdAt" DESC, ss."id" DESC
    ) AS row_rank
  FROM "CompanyCapabilityScore" AS ccs
  JOIN "SurveySubmission" AS ss
    ON ss."companyId" = ccs."companyId"
   AND ss."moduleId" = ccs."moduleId"
   AND ss."scoreVersion" = ccs."scoreVersion"
   AND (
     (ss."productId" IS NULL AND ccs."productId" IS NULL)
     OR ss."productId" = ccs."productId"
   )
  WHERE ccs."sourceType" = 'SELF_SUBMISSION'
    AND ccs."surveySubmissionId" IS NULL
)
UPDATE "CompanyCapabilityScore" AS ccs
SET "surveySubmissionId" = ranked_matches."survey_submission_id"
FROM ranked_matches
WHERE ranked_matches."capability_score_id" = ccs."id"
  AND ranked_matches."row_rank" = 1;
