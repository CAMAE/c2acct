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
        statusLabel: "Firm review available",
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

    expect(snapshot.vendorSelfReported.latestScore).toBe(84);
    expect(snapshot.vendorAssessmentStatus.completed).toBe(true);
    expect(snapshot.firmReviewed.assessmentCount).toBe(2);
    expect(snapshot.firmReviewed.averageScore).toBe(34);
    // WS11-D Block H.1: user-visible "utilities" → "features".
    expect(snapshot.product.utilityScopeLabel).toContain("2 declared features");
    expect(snapshot.divergence.points).toBe(50);
    expect(snapshot.divergence.label).toMatch(/Vendor self-view is running above firm-reviewed signal/);
    expect(snapshot.combinedCurrentPatReadout).toMatch(
      /vendor self-reported signal at 84% with firm-reviewed signal at 34% across 2 assessments/i
    );
    expect(snapshot.confidenceBand).toBe("sample_thin");
    expect(snapshot.confidenceSummary).toMatch(/sample-thin rather than broadly confirmed/i);
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
