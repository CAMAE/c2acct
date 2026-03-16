UPDATE "ExternalReviewSubmission"
SET "reviewStatus" = 'FINALIZED',
    "updatedAt" = NOW()
WHERE "reviewStatus" = 'SUBMITTED';
