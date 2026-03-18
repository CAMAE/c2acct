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

const WRITE_PATTERNS = [
  ".create(",
  ".createMany(",
  ".update(",
  ".updateMany(",
  ".upsert(",
  ".delete(",
  ".deleteMany(",
];

function assertNoWritePatterns(label: string, source: string) {
  for (const pattern of WRITE_PATTERNS) {
    assert(!source.includes(pattern), `${label} must not contain write pattern ${pattern}`);
  }
}

async function main() {
  const resultsRoute = read("app/api/results/route.ts");
  const badgesRoute = read("app/api/badges/earned/route.ts");
  const insightsRoute = read("app/api/insights/unlocked/route.ts");
  const dimensionsRoute = read("app/api/outputs/product-dimensions/route.ts");
  const intelligenceData = read("lib/intelligence/getProductIntelligencePageData.ts");
  const unlockEvaluator = read("lib/engine/evaluateInsightUnlocks.ts");

  for (const [label, source] of [
    ["results route", resultsRoute],
    ["badges route", badgesRoute],
    ["insights route", insightsRoute],
    ["product dimensions route", dimensionsRoute],
    ["product intelligence page data", intelligenceData],
    ["insight unlock evaluator", unlockEvaluator],
  ] as const) {
    assertNoWritePatterns(label, source);
  }

  assert(
    intelligenceData.includes("evaluateUnlockedInsights"),
    "product intelligence read path must use pure unlock evaluation"
  );
  assert(
    !intelligenceData.includes("evaluateAndPersistUnlockedInsights"),
    "product intelligence read path must not use mutating unlock evaluation"
  );
  assert(
    insightsRoute.includes("evaluateUnlockedInsights"),
    "insights GET route must use pure unlock evaluation"
  );
  assert(
    !insightsRoute.includes("evaluateAndPersistUnlockedInsights"),
    "insights GET route must not use mutating unlock evaluation"
  );
  assert(
    unlockEvaluator.includes("export async function evaluateUnlockedInsights"),
    "pure unlock evaluator export missing"
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        verified: [
          "canonical read routes contain no prisma writes",
          "product intelligence read path is non-mutating",
          "insights GET route is non-mutating",
        ],
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    "VERIFY_READ_PATH_PURITY_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
});
