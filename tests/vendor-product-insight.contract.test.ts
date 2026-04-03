import { describe, expect, it } from "vitest";
import { buildFirmProductQuestions } from "@/lib/firmPat";
import { normalizeAnswerForStoredScale } from "@/lib/productAssessmentRuntime";
import {
  buildVendorProductInsightSnapshot,
  type VendorProductInsightSnapshotInput,
} from "@/lib/vendorProductInsightEngine";
import { buildVendorProductQuestions } from "@/lib/vendorPat";

describe("vendor product insight runtime", () => {
  it("normalizes stored answers against the submission scale", () => {
    expect(normalizeAnswerForStoredScale(1, 1, 5)).toBe(0);
    expect(normalizeAnswerForStoredScale(3, 1, 5)).toBe(50);
    expect(normalizeAnswerForStoredScale(5, 1, 5)).toBe(100);
    expect(normalizeAnswerForStoredScale(4, 0, 5)).toBe(80);
    expect(normalizeAnswerForStoredScale(4, 4, 4)).toBeNull();
  });

  it("carries utility scope and stored-scale normalization into the insight snapshot", () => {
    const utilityKeys = ["ap_automation", "reporting_analytics"];
    const vendorQuestions = buildVendorProductQuestions(utilityKeys);
    const firmQuestions = buildFirmProductQuestions(utilityKeys);

    const vendorResponses = Object.fromEntries(
      vendorQuestions.map((question, index) => [question.id, index % 4 === 0 ? 5 : 4])
    );

    const firmResponseSets = [
      Object.fromEntries(firmQuestions.map((question, index) => [question.id, index % 5 === 0 ? 2 : 3])),
      Object.fromEntries(firmQuestions.map((question, index) => [question.id, index % 4 === 0 ? 1 : 2])),
    ];

    const fixture: VendorProductInsightSnapshotInput = {
      product: {
        id: "product-fixture",
        name: "PAT Fixture Product",
        summary: "Deterministic vendor product signal fixture.",
        utilityKeys,
      },
      vendorSelfReported: {
        latestScore: 84,
        submittedAt: new Date("2026-03-30T12:00:00.000Z"),
        responses: {
          answers: vendorResponses,
          scaleMin: 1,
          scaleMax: 5,
        },
      },
      firmReviewed: {
        assessmentCount: 2,
        latestSubmittedAt: new Date("2026-03-30T13:00:00.000Z"),
        averageScore: 34,
        responseSets: firmResponseSets.map((answers) => ({
          answers,
          scaleMin: 1,
          scaleMax: 5,
        })),
      },
    };

    const snapshot = buildVendorProductInsightSnapshot(fixture);

    expect(snapshot.product.utilityScopeLabel).toContain("2 declared utilities");
    expect(snapshot.confidenceCaveats.some((caveat) => caveat.includes("2 assessments"))).toBe(true);
    expect(snapshot.confidenceCaveats.some((caveat) => caveat.includes("50 points apart"))).toBe(true);
    expect(snapshot.insightRecords.some((record) => record.exactAssessmentBasis.includes("Utility scope:"))).toBe(
      true
    );
    expect(snapshot.vendorSelfReported.sectionEvidence.every((section) => section.averageScore !== null)).toBe(true);
    expect(snapshot.firmReviewed.utilityEvidence).toHaveLength(utilityKeys.length);
  });
});
