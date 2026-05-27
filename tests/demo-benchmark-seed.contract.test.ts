import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Static guard for the demo-bench vendor self-assessment pipeline.
 *
 * Day-15 audit v2 reclassified AUDIT-D15-001 (presumed missing vendor
 * self-assessment seed) as a false positive: the seed wiring exists
 * (`scripts/seed-demo-benchmark.ts` imports + calls
 * `seedVendorProductAssessment`, which writes `SurveySubmission` rows
 * that `getVendorProductInsightCatalog` consumes).
 *
 * This test catches a future regression where someone renames or
 * removes either side of that pipeline without thinking.
 *
 * Style note: uses readFileSync to match the repo's existing
 * tests/*.contract.test.ts style (insight-primitives, vendor-product
 * -insight, etc. — all sync reads).
 */

const ROOT = path.resolve(__dirname, "..");

describe("Demo benchmark seed wiring contract", () => {
  it("scripts/seed-demo-benchmark.ts imports and calls seedVendorProductAssessment", () => {
    const source = readFileSync(
      path.join(ROOT, "scripts/seed-demo-benchmark.ts"),
      "utf8"
    );
    // The seed script pulls demoPatEcosystemSeed in via a dynamic
    // Promise.all destructure, so we don't pin the import-statement
    // shape. What matters: the module is referenced AND the helper is
    // both named and invoked in the script.
    expect(source).toMatch(/@\/lib\/demoPatEcosystemSeed/);
    expect(source).toMatch(/\bseedVendorProductAssessment\b/);
    expect(source).toMatch(/await\s+seedVendorProductAssessment\s*\(/);
  });

  it("seedVendorProductAssessment writes a SurveySubmission row", () => {
    const source = readFileSync(
      path.join(ROOT, "lib/demoPatEcosystemSeed.ts"),
      "utf8"
    );
    // Extract the helper body (between the function signature and the
    // first top-level `export ` that follows it).
    const fnStart = source.indexOf("export async function seedVendorProductAssessment");
    expect(fnStart).toBeGreaterThan(-1);
    const remainder = source.slice(fnStart);
    const nextExport = remainder.indexOf("\nexport ", 1);
    const fnBody = nextExport > -1 ? remainder.slice(0, nextExport) : remainder;
    // The helper persists via prisma's SurveySubmission model (upsert or create).
    // This is the shape getVendorProductInsightCatalog reads from.
    expect(fnBody).toMatch(/\bsurveySubmission\.(upsert|create)\s*\(/);
  });
});
