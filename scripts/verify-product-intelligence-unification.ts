import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function main() {
  const productPage = read("app/products/[productId]/intelligence/page.tsx");
  const productSectionPage = read("app/products/[productId]/intelligence/[sectionKey]/page.tsx");
  const outputsPage = read("app/outputs/page.tsx");
  const pageData = read("lib/intelligence/getProductIntelligencePageData.ts");
  const reportProfiles = read("lib/report-profiles.ts");
  const moduleCatalog = read("lib/assessment-module-catalog.ts");

  if (!productPage.includes("getProductIntelligencePageData")) {
    fail("Canonical product page no longer uses getProductIntelligencePageData");
  }
  if (!productSectionPage.includes("getProductIntelligencePageData")) {
    fail("Canonical product section page no longer uses getProductIntelligencePageData");
  }
  if (!outputsPage.includes("getViewerIntelligencePageData")) {
    fail("Outputs bridge is not consuming the shared viewer intelligence helper");
  }
  if (!pageData.includes("getOutputSectionsForAssessmentTarget")) {
    fail("Shared viewer intelligence helper is not deriving sections from the registry");
  }
  if (!reportProfiles.includes('key: "product_intelligence_report"')) {
    fail("product_intelligence_report is missing");
  }
  if (!reportProfiles.includes('intelligenceProfileKey: "product_intelligence"')) {
    fail("product_intelligence_report intelligence profile drifted");
  }
  if (!reportProfiles.includes('supportingModuleKeys: listModulesForIntelligenceProfile("product_intelligence")')) {
    fail("product_intelligence_report no longer references the external review supporting module");
  }
  if (!moduleCatalog.includes('PRODUCT_EXTERNAL_REVIEW_MODULE_KEY = "product_workflow_fit_review_v1"')) {
    fail("Product external review module key drifted");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        sharedHelper: "getViewerIntelligencePageData",
        productHelper: "getProductIntelligencePageData",
      },
      null,
      2
    )
  );
}

try {
  main();
} catch (error) {
  console.error(
    "VERIFY_PRODUCT_INTELLIGENCE_UNIFICATION_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
