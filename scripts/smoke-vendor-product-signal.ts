import assert from "node:assert/strict";
import {
  buildVendorProductInsightSnapshot,
  type VendorProductInsightSnapshotInput,
} from "@/lib/vendorProductInsightEngine";
import {
  buildFirmProductQuestions,
} from "@/lib/firmPat";
import {
  buildVendorProductQuestions,
} from "@/lib/vendorPat";

const utilityKeys = ["ap_automation", "reporting_analytics"];

const vendorQuestions = buildVendorProductQuestions(utilityKeys);
const firmQuestions = buildFirmProductQuestions(utilityKeys);

const vendorResponses = Object.fromEntries(
  vendorQuestions.map((question, index) => [question.id, index % 6])
);

const firmResponseSets = [
  Object.fromEntries(firmQuestions.map((question, index) => [question.id, (index + 1) % 6])),
  Object.fromEntries(firmQuestions.map((question, index) => [question.id, (index + 3) % 6])),
];

const fixture: VendorProductInsightSnapshotInput = {
  product: {
    id: "product-fixture",
    name: "PAT Fixture Product",
    summary: "Deterministic vendor product signal fixture.",
    utilityKeys,
  },
  vendorAssessmentStatus: {
    completed: true,
    latestSubmittedAt: new Date("2026-03-30T12:00:00.000Z"),
    statusLabel: "Ready for firm review",
    reason: "Firm review is available because the vendor completed the full product assessment.",
  },
  vendorSelfReported: {
    latestScore: 84,
    submittedAt: new Date("2026-03-30T12:00:00.000Z"),
    responses: {
      answers: vendorResponses,
      scaleMin: 0,
      scaleMax: 5,
    },
  },
  firmReviewed: {
    assessmentCount: 2,
    latestSubmittedAt: new Date("2026-03-30T13:00:00.000Z"),
    averageScore: 34,
    responseSets: firmResponseSets.map((answers) => ({
      answers,
      scaleMin: 0,
      scaleMax: 5,
    })),
  },
};

const snapshot = buildVendorProductInsightSnapshot(fixture);

assert.equal(snapshot.vendorAssessmentStatus.completed, true, "Completed vendor assessment status should be explicit.");
assert.equal(snapshot.vendorSelfReported.latestScore, 84, "Vendor self-reported signal should be preserved.");
assert.equal(snapshot.firmReviewed.assessmentCount, 2, "Firm-reviewed sample size should be preserved.");
assert.equal(snapshot.firmReviewed.averageScore, 34, "Firm-reviewed average should remain explicit in the snapshot.");
assert.match(snapshot.product.utilityScopeLabel, /2 declared utilities/, "Utility scope should remain explicit.");
assert.equal(snapshot.divergence.points, 50, "Expected deterministic divergence between vendor and firm signal.");
assert.match(
  snapshot.divergence.label,
  /Vendor self-view is running above firm-reviewed signal/,
  "Divergence label should describe the direction of the gap."
);
assert.match(
  snapshot.combinedCurrentPatReadout,
  /vendor self-reported signal at 84% with firm-reviewed signal at 34% across 2 assessments/i,
  "Combined PAT readout should keep vendor and firm signals explicitly separate."
);
assert.ok(
  snapshot.confidenceCaveats.some((caveat) => caveat.includes("2 assessments")),
  "Small firm review samples should produce a confidence caveat."
);
assert.equal(snapshot.confidenceBand, "sample_thin", "Two firm reviews should remain sample-thin.");
assert.match(
  snapshot.confidenceSummary,
  /sample-thin rather than broadly confirmed/i,
  "Thin firm review samples should be described as sample-thin."
);
assert.ok(
  snapshot.confidenceCaveats.some((caveat) => caveat.includes("50 points apart")),
  "Large vendor-versus-firm gaps should produce a calibration caveat."
);
assert.ok(
  snapshot.insightRecords.every(
    (record) =>
      record.exactAssessmentBasis.includes("Vendor self-reported signal") &&
      record.exactAssessmentBasis.includes("Firm-reviewed signal")
  ),
  "Every product insight record should distinguish vendor self-report from firm-reviewed evidence."
);

console.log(
  "PASS smoke-vendor-product-signal: vendor self-view, firm-reviewed signal, and divergence are rendered distinctly."
);
