import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function main() {
  const surveySubmitRoute = read("app/api/survey/submit/route.ts");
  const visibility = read("lib/visibility/index.ts");
  const trustedReviews = read("lib/reviews/trustedExternalReview.ts");
  const intelligence = read("lib/intelligence/getProductIntelligencePageData.ts");
  const loaderHygiene = read("scripts/verify-loader-bridge-hygiene.ts");
  const repoHygiene = read("scripts/verify-repo-hygiene.ts");

  if (!surveySubmitRoute.includes("buildTargetScopeKey")) {
    fail("Scoped integrity closure drifted");
  }
  if (!visibility.includes("resolveVisibleSubject")) {
    fail("Visibility closure drifted");
  }
  if (!trustedReviews.includes('TRUSTED_EXTERNAL_REVIEW_STATUSES = ["FINALIZED"]')) {
    fail("External review trust closure drifted");
  }
  if (!intelligence.includes("unlockEvidence")) {
    fail("Product intelligence evidence closure drifted");
  }
  if (!loaderHygiene.includes("app/results/page.tsx")) {
    fail("Loader hygiene verifier drifted");
  }
  if (!repoHygiene.includes("lib/companyContext.ts")) {
    fail("Repo hygiene verifier drifted");
  }

  console.log(JSON.stringify({ ok: true, closure: "3.14 audit" }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(
    "VERIFY_AUDIT_CLOSURE_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
