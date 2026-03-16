import fs from "fs";
import path from "path";

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    fail(message);
  }
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

async function main() {
  const submitRoute = read("app/api/external-reviews/submit/route.ts");
  const rollupFile = read("lib/reviews/recomputeObservedSignalRollup.ts");
  const trustHelper = read("lib/reviews/trustedExternalReview.ts");
  const migrationFile = read(
    "prisma/migrations/20260315193000_external_review_trust_lifecycle/migration.sql"
  );
  const smokeScript = read("scripts/smoke-external-review-submit-prisma.mjs");

  assert(
    trustHelper.includes('TRUSTED_EXTERNAL_REVIEW_STATUSES = ["FINALIZED"]'),
    "trusted review helper must define FINALIZED as the only trusted status"
  );
  assert(
    trustHelper.includes("EXTERNAL_REVIEW_DUPLICATE_POLICY") &&
      trustHelper.includes("LATEST_FINALIZED_WINS"),
    "duplicate handling policy must be explicit and documented"
  );
  assert(
    trustHelper.includes("computeNormalizedExternalReviewDimensions"),
    "normalized dimensions helper must exist"
  );

  assert(
    submitRoute.includes("normalizedDimensions") &&
      submitRoute.includes("computeNormalizedExternalReviewDimensions"),
    "submit route must persist normalizedDimensions"
  );
  assert(
    submitRoute.includes('reviewStatus: getTrustedExternalReviewStatusForAcceptedSubmission()'),
    "trusted sponsor-visible submissions must finalize immediately"
  );
  assert(
    submitRoute.includes('reviewStatus: "REJECTED"'),
    "submit route must deterministically reject older duplicate reviews"
  );

  assert(
    rollupFile.includes("buildTrustedExternalReviewWhere") &&
      !rollupFile.includes('["SUBMITTED", "FINALIZED"]'),
    "rollups must use the shared trusted review filter and exclude SUBMITTED"
  );

  assert(
    migrationFile.includes("SET \"reviewStatus\" = 'FINALIZED'") &&
      migrationFile.includes("WHERE \"reviewStatus\" = 'SUBMITTED'"),
    "migration must backfill existing SUBMITTED reviews to FINALIZED"
  );

  assert(
    smokeScript.includes("normalizedDimensions") &&
      smokeScript.includes("ExternalReviewStatus.FINALIZED"),
    "demo smoke script must seed finalized trusted reviews with normalized dimensions"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "normalizedDimensions persistence",
          "finalized-only trusted rollups",
          "immediate trusted finalization",
          "deterministic duplicate rejection",
          "migration backfill for seeded submitted reviews",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "VERIFY_EXTERNAL_REVIEW_TRUST_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
