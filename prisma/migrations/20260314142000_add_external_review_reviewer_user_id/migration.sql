ALTER TABLE "ExternalReviewSubmission"
ADD COLUMN "reviewerUserId" TEXT;

CREATE INDEX "ExternalReviewSubmission_reviewerUserId_idx"
ON "ExternalReviewSubmission"("reviewerUserId");

ALTER TABLE "ExternalReviewSubmission"
ADD CONSTRAINT "ExternalReviewSubmission_reviewerUserId_fkey"
FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
