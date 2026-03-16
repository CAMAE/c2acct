import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function main() {
  const evaluateUnlocks = read("lib/engine/evaluateInsightUnlocks.ts");
  const persistEvidence = read("lib/engine/persistUnlockEvidence.ts");
  const intelligencePageData = read("lib/intelligence/getProductIntelligencePageData.ts");

  if (!persistEvidence.includes('sourceType: "SELF_SUBMISSION"')) {
    fail("Self-submission unlock evidence writer drifted");
  }
  if (!evaluateUnlocks.includes("ruleKey: evidenceKey")) {
    fail("Insight unlock rule keys are no longer persisted");
  }
  if (!evaluateUnlocks.includes("capabilityEvidence")) {
    fail("Capability evidence details are no longer persisted");
  }
  if (!evaluateUnlocks.includes("surveySubmissionId: representativeSource")) {
    fail("Insight unlock evidence no longer links to a survey submission");
  }
  if (!intelligencePageData.includes("unlockEvidence: buildUnlockEvidence")) {
    fail("Runtime intelligence cards no longer expose unlock evidence");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          "self-submission evidence persistence",
          "insight rule key persistence",
          "runtime unlock evidence exposure",
        ],
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
    "VERIFY_INSIGHT_UNLOCK_EVIDENCE_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
