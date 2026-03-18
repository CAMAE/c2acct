CREATE UNIQUE INDEX "ExternalReviewSubmission_single_finalized_identity_idx"
ON "ExternalReviewSubmission"(
  "reviewerCompanyId",
  COALESCE("reviewerUserId", '__NONE__'),
  "subjectCompanyId",
  COALESCE("subjectProductId", '__NONE__'),
  "moduleId"
)
WHERE "reviewStatus" = 'FINALIZED';
