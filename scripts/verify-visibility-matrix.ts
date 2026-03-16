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
  const visibilityFile = read("lib/visibility/index.ts");
  const resultsRoute = read("app/api/results/route.ts");
  const badgesRoute = read("app/api/badges/earned/route.ts");
  const insightsRoute = read("app/api/insights/unlocked/route.ts");
  const dimensionsRoute = read("app/api/outputs/product-dimensions/route.ts");
  const externalReviewSubmitRoute = read("app/api/external-reviews/submit/route.ts");
  const surveyModulesRoute = read("app/api/survey/modules/route.ts");
  const productsContextRoute = read("app/api/products/context/route.ts");

  assert(
    visibilityFile.includes('currentCompany.type === "FIRM"') &&
      visibilityFile.includes("vendorCompany") &&
      visibilityFile.includes('productAccessMode: "ALL_PRODUCTS"'),
    "visibility matrix must expose sponsored vendors and sponsored vendor products for firms"
  );

  assert(
    visibilityFile.includes('currentCompany.type !== "FIRM"') ||
      visibilityFile.includes('currentCompany.type === "FIRM"'),
    "visibility helper should branch on current company type"
  );
  assert(
    visibilityFile.includes('accessReason: "OWNED"') &&
      visibilityFile.includes('accessReason: "SPONSORED"'),
    "visible products must distinguish owned vs sponsored access"
  );
  assert(
    visibilityFile.includes("resolveVisibleSubject") &&
      visibilityFile.includes("requestedCompanyId") &&
      visibilityFile.includes("requestedProductId"),
    "shared visible subject resolver must exist for company/product subject access"
  );

  for (const [label, contents] of [
    ["results", resultsRoute],
    ["badges", badgesRoute],
    ["insights", insightsRoute],
    ["product dimensions", dimensionsRoute],
  ]) {
    assert(
      contents.includes("resolveVisibleSubject"),
      `${label} route must resolve subjects through visibility helpers`
    );
    assert(
      contents.includes("includeSponsoredProducts: true"),
      `${label} route must allow sponsor-visible vendor products`
    );
  }

  assert(
    externalReviewSubmitRoute.includes('Only firm companies can submit external reviews') &&
      externalReviewSubmitRoute.includes('External reviews can only target vendor companies'),
    "external review submit route must be firm-only and vendor-targeted"
  );

  assert(
    surveyModulesRoute.includes("allowedScopes") &&
      surveyModulesRoute.includes('currentCompanyType === "FIRM"') &&
      surveyModulesRoute.includes('currentCompanyType === "VENDOR"'),
    "survey modules route must filter modules by viewer company type"
  );

  assert(
    productsContextRoute.includes("includeSponsoredProducts") &&
      productsContextRoute.includes("listVisibleProducts"),
    "product context route must derive product options from visibility helpers"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "visibility subject resolution",
          "firm/vendor visibility branching",
          "sponsor-aware read route enforcement",
          "firm-only external review targeting",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "VERIFY_VISIBILITY_MATRIX_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
