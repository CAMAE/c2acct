import fs from "node:fs";
import path from "node:path";
function fail(message: string): never {
  throw new Error(message);
}

function assertNoLaunchConfigImport(relativePath: string) {
  const filePath = path.join(process.cwd(), relativePath);
  const source = fs.readFileSync(filePath, "utf8");
  if (source.includes("launch-config")) {
    fail(`${relativePath} still imports launch-config`);
  }
}

function main() {
  const outputRegistry = fs.readFileSync(
    path.join(process.cwd(), "lib/intelligence/outputRegistry.ts"),
    "utf8"
  );

  if (!outputRegistry.includes('insightKey: "product_workflow_fit_snapshot"') || !outputRegistry.includes('kind: "ANY_OF"')) {
    fail("product_workflow_fit_snapshot must be registry-gated by ANY_OF");
  }
  if (!outputRegistry.includes('{ type: "OBSERVED_SIGNAL", cardId: "product_workflow_fit_snapshot" }')) {
    fail("product_workflow_fit_snapshot must declare observed signal as an explicit evidence lane");
  }
  if (!outputRegistry.includes('insightKey: "product_support_confidence_signal"')) {
    fail("product_support_confidence_signal must be registry-gated by ANY_OF");
  }
  if (!outputRegistry.includes('{ type: "OBSERVED_SIGNAL", cardId: "product_support_confidence_signal" }')) {
    fail("product_support_confidence_signal must declare observed signal as an explicit evidence lane");
  }
  if (!outputRegistry.includes('id: "observed_market_signal"')) {
    fail("Observed market signal section is missing from the canonical registry");
  }
  if (!outputRegistry.includes('id: "observed_market_signal_summary"') || !outputRegistry.includes('id: "observed_market_confidence"')) {
    fail("Observed market signal cards are missing from the canonical registry");
  }

  for (const relativePath of [
    "lib/intelligence/outputRegistry.ts",
    "lib/intelligence/getProductIntelligencePageData.ts",
    "lib/assessment-module-catalog.ts",
    "lib/insight-unlock-config.ts",
    "lib/capability-catalog.ts",
    "app/outputs/page.tsx",
  ]) {
    assertNoLaunchConfigImport(relativePath);
  }

  const outputsPageSource = fs.readFileSync(path.join(process.cwd(), "app/outputs/page.tsx"), "utf8");
  if (!outputsPageSource.includes("getViewerIntelligencePageData")) {
    fail("app/outputs/page.tsx is not consuming the canonical viewer intelligence helper");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        blendedCardIds: ["product_workflow_fit_snapshot", "product_support_confidence_signal"],
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
    "VERIFY_PRODUCT_INTELLIGENCE_GATES_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
