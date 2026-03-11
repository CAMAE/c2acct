-- Integrity guardrails for unlock evidence source linkage.
ALTER TABLE "UnlockEvidence"
ADD CONSTRAINT "UnlockEvidence_sourceType_reference_check"
CHECK (
  (
    "sourceType" = 'SELF_SUBMISSION'
    AND "surveySubmissionId" IS NOT NULL
    AND "externalObservedSignalRollupId" IS NULL
  )
  OR
  (
    "sourceType" = 'EXTERNAL_REVIEW_ROLLUP'
    AND "externalObservedSignalRollupId" IS NOT NULL
    AND "surveySubmissionId" IS NULL
  )
);
