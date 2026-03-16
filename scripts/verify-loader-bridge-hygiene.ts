import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function assertNoRequestOrigin(relativePath: string) {
  const source = read(relativePath);
  if (source.includes("getRequestOrigin") || source.includes("request-origin")) {
    fail(`${relativePath} still uses request-origin`);
  }
  if (source.includes("fetch(`${apiBaseUrl}/api/")) {
    fail(`${relativePath} still performs protected internal self-fetching`);
  }
}

function main() {
  for (const relativePath of [
    "app/results/page.tsx",
    "app/outputs/page.tsx",
    "app/survey/page.tsx",
  ]) {
    assertNoRequestOrigin(relativePath);
  }

  const outputsPage = read("app/outputs/page.tsx");
  if (!outputsPage.includes('redirect(`/products/${encodeURIComponent(productId.trim())}/intelligence`)')) {
    fail("/outputs no longer redirects product contexts to canonical product intelligence routes");
  }
  if (!outputsPage.includes("getViewerIntelligencePageData")) {
    fail("/outputs is not loader-backed");
  }

  const resultsPage = read("app/results/page.tsx");
  if (!resultsPage.includes("getViewerResultsPageData")) {
    fail("Results page is not using the shared results loader");
  }

  const surveyPage = read("app/survey/page.tsx");
  if (!surveyPage.includes("getSurveyEntryPageData")) {
    fail("Survey page is not using the shared survey-entry loader");
  }

  if (fs.existsSync(path.join(process.cwd(), "lib/request-origin.ts"))) {
    fail("lib/request-origin.ts should be deleted after loader canonicalization");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedPages: ["app/results/page.tsx", "app/outputs/page.tsx", "app/survey/page.tsx"],
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
    "VERIFY_LOADER_BRIDGE_HYGIENE_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
