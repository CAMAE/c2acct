import fs from "node:fs";
import path from "node:path";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function fail(message: string): never {
  throw new Error(message);
}

function assert(condition: unknown, message: string) {
  if (!condition) {
    fail(message);
  }
}

function assertNoWritePatterns(label: string, source: string) {
  for (const pattern of [".create(", ".createMany(", ".update(", ".updateMany(", ".upsert(", ".delete(", ".deleteMany("]) {
    assert(!source.includes(pattern), `${label} must stay read-only and must not contain ${pattern}`);
  }
}

async function main() {
  const chartSeries = read("lib/intelligence/chartSeries.ts");
  const productView = read("app/products/ProductIntelligenceView.tsx");
  const firmDetail = read("app/firm/insights/[insightKey]/page.tsx");
  const vendorDetail = read("app/vendor/insights/[insightKey]/page.tsx");
  const userDetail = read("app/user/insights/[insightKey]/page.tsx");
  const trendChart = read("components/charts/InsightTrendChart.tsx");
  const advancedChart = read("components/charts/InsightAdvancedChart.tsx");
  const registry = read("lib/intelligence/outputRegistry.ts");

  assertNoWritePatterns("chart series contract", chartSeries);

  assert(chartSeries.includes("buildTrustedExternalReviewWhere"), "Chart series contract must use trusted external review filtering");
  assert(chartSeries.includes('monthly: buildSeries("monthly"'), "Chart series contract must include monthly aggregation");
  assert(chartSeries.includes('quarterly: buildSeries("quarterly"'), "Chart series contract must include quarterly aggregation");
  assert(chartSeries.includes('yearly: buildSeries("yearly"'), "Chart series contract must include yearly aggregation");
  assert(chartSeries.includes("No persisted history is available for this scope yet."), "Chart series contract must expose truthful empty-state language");

  assert(productView.includes("InsightTrendChart") && productView.includes("InsightAdvancedChart"), "Product intelligence view must render the chart components");
  assert(productView.includes("No synthetic history is introduced"), "Product intelligence view must disclose the non-synthetic history rule");

  assert(firmDetail.includes("InsightDetailPage"), "Firm insight detail page missing");
  assert(vendorDetail.includes("InsightDetailPage"), "Vendor insight detail page missing");
  assert(userDetail.includes("InsightDetailPage"), "User insight detail page missing");

  assert(trendChart.includes("Self signal") && trendChart.includes("Observed signal"), "Simple chart must show self and observed evidence lanes");
  assert(advancedChart.includes("Gap vs integrity"), "Advanced chart must expose the analytical gap/integrity view");

  assert(registry.includes("product_workflow_fit_snapshot") && registry.includes('type: "OBSERVED_SIGNAL"'), "Registry must keep observed signal tied to explicit product cards");
  assert(!registry.includes('kind: "BADGE_ONLY"'), "Registry must not contain coarse badge-only release logic for intelligence cards");

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "read-only chart series contract",
          "monthly quarterly yearly aggregations",
          "simple and advanced chart components",
          "role-specific insight detail routes",
          "no coarse badge-only intelligence gating in registry",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("VERIFY_CHART_DATA_CONTRACT_ERROR", error instanceof Error ? error.message : error);
  process.exit(1);
});
