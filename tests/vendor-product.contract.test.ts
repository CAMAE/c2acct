import { describe, expect, it } from "vitest";
import { buildFirmProductQuestions } from "@/lib/firmPat";
import {
  buildVendorProductInsightSnapshot,
  type VendorProductInsightSnapshotInput,
} from "@/lib/vendorProductInsightEngine";
import { buildVendorProductQuestions } from "@/lib/vendorPat";

describe("vendor product combined signal behavior", () => {
  it("keeps vendor self-report and firm-reviewed signal explicit in the combined snapshot", () => {
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
        responses: vendorResponses,
      },
      firmReviewed: {
        assessmentCount: 2,
        latestSubmittedAt: new Date("2026-03-30T13:00:00.000Z"),
        averageScore: 34,
        responseSets: firmResponseSets,
      },
    };

    const snapshot = buildVendorProductInsightSnapshot(fixture);

    expect(snapshot.vendorSelfReported.latestScore).toBe(84);
    expect(snapshot.firmReviewed.assessmentCount).toBe(2);
    expect(snapshot.firmReviewed.averageScore).toBe(34);
    expect(snapshot.divergence.points).toBe(50);
    expect(snapshot.divergence.label).toMatch(/Vendor self-view is running above firm-reviewed signal/);
    expect(snapshot.combinedCurrentPatReadout).toMatch(
      /vendor self-reported signal at 84% with firm-reviewed signal at 34% across 2 assessments/i
    );
    expect(snapshot.confidenceBand).toBe("directional");
    expect(snapshot.confidenceSummary).toMatch(/directional rather than broadly confirmed/i);
    expect(snapshot.confidenceCaveats.some((caveat) => caveat.includes("2 assessments"))).toBe(true);
    expect(snapshot.confidenceCaveats.some((caveat) => caveat.includes("50 points apart"))).toBe(true);
    expect(
      snapshot.insightRecords.every(
        (record) =>
          record.exactAssessmentBasis.includes("Vendor self-reported signal") &&
          record.exactAssessmentBasis.includes("Firm-reviewed signal")
      )
    ).toBe(true);
  });
});
