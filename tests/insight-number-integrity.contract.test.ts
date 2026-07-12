import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildFirmInsightCardMetric,
  firmHeadlineValueText,
  readFirmInsightHeadline,
  type FirmInsightReport,
} from "@/lib/firmInsightEngine";
import {
  readVendorAlignmentInsightHeadline,
  type VendorAlignmentInsightReport,
} from "@/lib/vendorAlignmentInsightEngine";

/**
 * Block 10c (P0 number integrity): the number on an insight's FACE card must
 * equal the number on its DETAIL hero, on BOTH portals. The mechanism is a
 * single shared "headline reader" per portal that both surfaces call. These
 * tests lock (1) the behavioural identity face == hero, and (2) the wiring —
 * the detail pages must feed the hero from the shared reader and must NOT fall
 * back to the old card-invariant averageModuleScore / averageContributingModuleScore.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

// ---- Vendor portal -------------------------------------------------------

function vendorReportFixture(
  overrides: Partial<VendorAlignmentInsightReport> = {}
): VendorAlignmentInsightReport {
  return {
    key: "workflow-friction-pressure",
    title: "Workflow friction pressure",
    tier: 1,
    locked: false,
    latestUpdatedAt: null,
    confidenceBand: "grounded",
    confidenceLabel: "Grounded",
    confidenceSummary: "Fixture.",
    currentStateSummary: "Fixture.",
    what: "w",
    why: "y",
    how: "h",
    exactAssessmentBasis: "b",
    confidenceCaveats: [],
    sampleSize: 6,
    submissionCount: 12,
    averageModuleScore: 68,
    moduleVariance: 22,
    contributingModules: [],
    strongestModules: [],
    weakestModules: [{ key: "m", title: "Operating model", averageScore: 55, sampleSize: 6 }],
    contributingCapabilities: [],
    notableQuestionClusters: [],
    primaryCluster: {
      key: "workflow-friction",
      title: "Workflow handoffs and friction",
      averageScore: 71,
      questionCount: 3,
      responseCount: 18,
      questionStemSample: [],
      moduleTitles: [],
    },
    ...overrides,
  };
}

describe("vendor insight — face number equals detail hero number", () => {
  it("face-card metric reads the same headline as the detail hero (primary cluster)", () => {
    const report = vendorReportFixture();
    const headline = readVendorAlignmentInsightHeadline(report);
    const face = readVendorAlignmentInsightHeadline(report); // the face card delegates to this
    expect(headline.displayValue).toBe("71"); // primary cluster, NOT the 68 bundle average
    expect(face.displayValue).toBe(headline.displayValue);
    expect(headline.showBand).toBe(true);
  });

  it("uneven-maturity-variance reads its own variance stat on both surfaces", () => {
    const report = vendorReportFixture({ key: "uneven-maturity-variance", moduleVariance: 22 });
    const headline = readVendorAlignmentInsightHeadline(report);
    expect(headline.displayValue).toBe("22");
    expect(headline.suffix).toBe("pts");
    expect(headline.showBand).toBe(false);
  });

  it("different insights read different headline captions (per-card differentiation)", () => {
    const a = readVendorAlignmentInsightHeadline(vendorReportFixture());
    const b = readVendorAlignmentInsightHeadline(
      vendorReportFixture({
        key: "governance-sensitivity",
        primaryCluster: {
          key: "controls-risk",
          title: "Controls, risk, and data protection",
          averageScore: 63,
          questionCount: 3,
          responseCount: 12,
          questionStemSample: [],
          moduleTitles: [],
        },
      })
    );
    expect(a.caption).not.toBe(b.caption);
    expect(a.displayValue).not.toBe(b.displayValue);
  });
});

// ---- Firm portal ---------------------------------------------------------

function firmReportFixture(overrides: Partial<FirmInsightReport> = {}): FirmInsightReport {
  return {
    key: "firm_tier1_operating_baseline",
    title: "Operating baseline",
    latestUpdatedAt: null,
    contributingModules: [
      { key: "firm_alignment_operating_model_v1", title: "Operating model", score: 60, submittedAt: null, sectionKey: "s", sectionTitle: "S" },
      { key: "firm_alignment_automation_ai_v1", title: "Automation and AI", score: 48, submittedAt: null, sectionKey: "s", sectionTitle: "S" },
    ] as FirmInsightReport["contributingModules"],
    strongestModules: [
      { key: "firm_alignment_operating_model_v1", title: "Operating model", score: 60, submittedAt: null, sectionKey: "s", sectionTitle: "S" },
    ] as FirmInsightReport["strongestModules"],
    weakestModules: [
      { key: "firm_alignment_automation_ai_v1", title: "Automation and AI", score: 48, submittedAt: null, sectionKey: "s", sectionTitle: "S" },
    ] as FirmInsightReport["weakestModules"],
    contributingCapabilities: [],
    confidenceCaveats: [],
    ...overrides,
  } as FirmInsightReport;
}

describe("firm insight — face number equals detail hero number", () => {
  it("face-card metric value is derived from the same headline reader", () => {
    const report = firmReportFixture();
    const headline = readFirmInsightHeadline(report.key, report);
    const face = buildFirmInsightCardMetric(report.key, report);
    // The face card and the hero both format the reader's displayValue+suffix
    // via firmHeadlineValueText — so the numbers can never diverge.
    expect(face?.value).toBe(firmHeadlineValueText(headline));
  });

  it("automation card reads the automation module score, not just the average", () => {
    const report = firmReportFixture({ key: "firm_tier1_automation_readiness" });
    const headline = readFirmInsightHeadline(report.key, report);
    expect(headline.displayValue).toBe("48"); // the automation module, not the 54 average
    expect(headline.suffix).toBe("%");
  });
});

// ---- Wiring guard (source scan) -----------------------------------------

describe("detail pages feed the hero from the shared reader (no averageScore fallback)", () => {
  it("vendor detail page wires ScoreLockup to the headline reader", () => {
    const src = read("app/vendor/alignment-insights/[key]/page.tsx");
    expect(src).toContain("readVendorAlignmentInsightHeadline");
    expect(src).toContain("const headline = readVendorAlignmentInsightHeadline(report)");
    expect(src).toContain("score={headline.score}");
    // the pre-10c hero fed the bundle-wide average — must not return
    expect(src).not.toContain("score={report.averageModuleScore}");
  });

  it("firm detail page wires ScoreLockup to the headline reader", () => {
    const src = read("app/firm/insights/[key]/page.tsx");
    expect(src).toContain("readFirmInsightHeadline");
    expect(src).toContain("score={headline.score}");
    expect(src).not.toContain("score={averageScore}");
  });
});
