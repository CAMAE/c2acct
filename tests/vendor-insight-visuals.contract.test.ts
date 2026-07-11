import { describe, expect, it } from "vitest";
import {
  buildVendorAlignmentPlainLanguage,
  type VendorAlignmentInsightReport,
} from "@/lib/vendorAlignmentInsightEngine";
import {
  buildVendorProductGapCallout,
  buildVendorProductPlainLanguage,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

const GUARDRAIL = /benchmark|percentile|projection|forecast|peer|market average|typical firm|market ranking/i;

function productSnapshotFixture(overrides: {
  vendorScore: number | null;
  firmScore: number | null;
  assessmentCount: number;
  divergencePoints: number | null;
}): VendorProductInsightSnapshot {
  return {
    product: {
      id: "product-1",
      name: "LedgerFlow",
      category: "Close management",
      summary: null,
      utilityKeys: ["document-capture"],
      utilityLabels: ["Document capture"],
      utilityScopeLabel: "1 declared feature: Document capture",
    },
    vendorAssessmentStatus: {
      completed: true,
      latestSubmittedAt: new Date("2026-06-01T12:00:00.000Z"),
      statusLabel: "Completed",
      reason: "fixture",
    },
    vendorSelfReported: {
      latestScore: overrides.vendorScore,
      submittedAt: new Date("2026-06-01T12:00:00.000Z"),
      sectionEvidence: [
        { key: "workflow-fit", title: "Workflow fit", averageScore: 88, questionCount: 4 },
        { key: "operational-dependence", title: "Operational dependence", averageScore: 81, questionCount: 4 },
        { key: "adoption-ease", title: "Adoption ease", averageScore: 79, questionCount: 4 },
        { key: "value-clarity", title: "Measurable value", averageScore: 72, questionCount: 4 },
      ],
      dimensionEvidence: [],
    },
    firmReviewed: {
      assessmentCount: overrides.assessmentCount,
      averageScore: overrides.firmScore,
      latestSubmittedAt: overrides.assessmentCount > 0 ? new Date("2026-06-05T12:00:00.000Z") : null,
      utilityEvidence: [],
      dimensionEvidence: [],
    },
    divergence: {
      points: overrides.divergencePoints,
      label: "fixture divergence label",
      belowFloor: false,
    },
    latestUpdatedAt: new Date("2026-06-05T12:00:00.000Z"),
    confidenceBand: "sample_thin",
    confidenceLabel: "Sample-thin current-state signal",
    confidenceSummary: "Fixture confidence.",
    combinedCurrentPatReadout: "Fixture combined readout.",
    confidenceCaveats: ["Fixture caveat."],
    insightRecords: [],
  };
}

function alignmentReportFixture(
  overrides: Partial<VendorAlignmentInsightReport> = {}
): VendorAlignmentInsightReport {
  const modules = [
    { key: "firm_alignment_operating_model_v1", title: "Operating Model and Workflow Discipline", averageScore: 76, sampleSize: 5 },
    { key: "firm_alignment_governance_v1", title: "Governance, Controls, and Vendor Risk", averageScore: 70, sampleSize: 5 },
    { key: "firm_alignment_data_flow_v1", title: "Integration and Data Flow Maturity", averageScore: 58, sampleSize: 5 },
  ];
  return {
    key: "operating-discipline-demand",
    title: "Operating discipline demand",
    tier: 1,
    locked: false,
    latestUpdatedAt: null,
    confidenceBand: "emerging",
    confidenceLabel: "Limited signal",
    confidenceSummary: "Fixture confidence.",
    currentStateSummary: "Fixture summary.",
    what: "Fixture what.",
    why: "Fixture why.",
    how: "Fixture how.",
    exactAssessmentBasis: "Fixture basis.",
    confidenceCaveats: ["Fixture caveat."],
    sampleSize: 5,
    submissionCount: 12,
    averageModuleScore: 68,
    moduleVariance: 40,
    contributingModules: modules,
    strongestModules: [modules[0]],
    weakestModules: [modules[2]],
    contributingCapabilities: [],
    notableQuestionClusters: [],
    ...overrides,
  };
}

describe("vendor product gap callout", () => {
  it("annotates direction and magnitude of the divergence", () => {
    expect(
      buildVendorProductGapCallout({ divergence: { points: 9.5, label: "", belowFloor: false } }).label
    ).toBe("9.5 pt divergence · firms read this product lower than the vendor story");
    expect(
      buildVendorProductGapCallout({ divergence: { points: -7, label: "", belowFloor: false } }).label
    ).toBe("7 pt divergence · firms read this product higher than the vendor story");
    expect(
      buildVendorProductGapCallout({ divergence: { points: 2.4, label: "", belowFloor: false } }).label
    ).toBe("2.4 pt divergence · vendor story and firm reviews closely aligned");
    expect(buildVendorProductGapCallout({ divergence: { points: null, label: "", belowFloor: false } })).toEqual({
      points: null,
      label: "Not enough shared signal yet",
    });
  });
});

describe("vendor product plain language", () => {
  it("explains a vendor-over-firm divergence in 5 sentences from the same payload", () => {
    const plain = buildVendorProductPlainLanguage(
      productSnapshotFixture({ vendorScore: 84.5, firmScore: 75, assessmentCount: 3, divergencePoints: 9.5 }),
      null
    );

    expect(plain?.summary).toContain(
      "LedgerFlow reads 85% in your self-assessment and 75% across 3 firm reviews — a 9.5-point divergence."
    );
    expect(plain?.summary).toContain("Firms are currently reading the product lower than the vendor story");
    expect(plain?.summary).toContain("Measurable value is your softest self-reported section at 72%");
    expect(plain?.summary).toContain("generally strengthens your product-market evidence");
    expect(plain?.summary).toContain("3 firm reviews currently stand behind the firm-reviewed signal");
    expect(plain?.summary.split(/(?<=\.)\s+/)).toHaveLength(5);
    expect(plain?.nextSteps).toEqual([
      "Strengthen the measurable value story before the next round of firm reviews.",
    ]);
    expect(plain?.summary).not.toMatch(GUARDRAIL);
  });

  it("flips the direction sentence when firms read the product higher", () => {
    const plain = buildVendorProductPlainLanguage(
      productSnapshotFixture({ vendorScore: 68, firmScore: 79, assessmentCount: 4, divergencePoints: -11 }),
      null
    );

    expect(plain?.summary).toContain("reviewers are confirming more operational value than the self-assessment claims");
    expect(plain?.summary).not.toMatch(GUARDRAIL);
  });

  it("handles the vendor-only case without implying buyer confirmation", () => {
    const plain = buildVendorProductPlainLanguage(
      productSnapshotFixture({ vendorScore: 81, firmScore: null, assessmentCount: 0, divergencePoints: null }),
      null
    );

    expect(plain?.summary).toContain("no firm has reviewed it yet");
    expect(plain?.summary).toContain("vendor-authored story without buyer confirmation");
    expect(plain?.summary).toContain("getting the product in front of firm reviewers");
    expect(plain?.summary).not.toMatch(GUARDRAIL);
  });

  it("returns null when no signal exists at all", () => {
    expect(
      buildVendorProductPlainLanguage(
        productSnapshotFixture({ vendorScore: null, firmScore: null, assessmentCount: 0, divergencePoints: null }),
        null
      )
    ).toBeNull();
  });
});

describe("vendor alignment plain language", () => {
  it("interprets the aggregated firm signal from the vendor point of view", () => {
    const plain = buildVendorAlignmentPlainLanguage(alignmentReportFixture());

    expect(plain?.summary).toContain("Firms in your current evidence base average 68 — Building");
    expect(plain?.summary).toContain(
      "The strongest firm-side signal is Operating Model and Workflow Discipline; the softest is Integration and Data Flow Maturity at 58%."
    );
    expect(plain?.summary).toContain("rollouts still depend on individual champions");
    expect(plain?.summary).toContain("longer connection work and more data cleanup");
    expect(plain?.summary).toContain("current-state evidence from 12 module submissions");
    expect(plain?.summary).not.toMatch(GUARDRAIL);
  });

  it("varies the practical clauses by band and softest module", () => {
    const governanceWeak = alignmentReportFixture({
      averageModuleScore: 74,
      weakestModules: [
        { key: "firm_alignment_governance_v1", title: "Governance, Controls, and Vendor Risk", averageScore: 49, sampleSize: 5 },
      ],
    });
    const plain = buildVendorAlignmentPlainLanguage(governanceWeak);

    expect(plain?.summary).toContain("Established");
    expect(plain?.summary).toContain("operating discipline to evaluate structured tooling");
    expect(plain?.summary).toContain("security and vendor-risk reviews to run slowly");
    expect(plain?.summary).not.toBe(buildVendorAlignmentPlainLanguage(alignmentReportFixture())?.summary);
  });

  it("returns null for locked or signal-less reports", () => {
    expect(buildVendorAlignmentPlainLanguage(alignmentReportFixture({ locked: true, tier: 2 }))).toBeNull();
    expect(buildVendorAlignmentPlainLanguage(alignmentReportFixture({ averageModuleScore: null }))).toBeNull();
  });
});
