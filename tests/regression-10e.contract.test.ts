import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildVendorAlignmentInsightDetailSurfaceContent,
  type VendorAlignmentInsightReport,
} from "@/lib/vendorAlignmentInsightEngine";

/**
 * Block 10e — three re-verified regressions:
 *  (1) product-intel face card divergence line → concise "N.N pt divergence"
 *      (covered in vendor-insight-visuals.contract.test.ts).
 *  (2) self-reported puzzle-piece text overruns the piece border.
 *  (3) vendor alignment detail Elite pane carried stale "not live / not
 *      claiming benchmark" prose that contradicted the live Elite pane.
 */

// Repo root, resolved at run time — vitest runs from the project root.
// A hardcoded absolute path breaks the suite for every other machine (RK20).
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

function alignmentReport(
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
    currentStateSummary: "Fixture current state.",
    what: "w",
    why: "y",
    how: "h",
    exactAssessmentBasis: "b",
    confidenceCaveats: [],
    sampleSize: 6,
    submissionCount: 12,
    averageModuleScore: 66,
    moduleVariance: 20,
    contributingModules: [],
    strongestModules: [],
    weakestModules: [],
    contributingCapabilities: [],
    notableQuestionClusters: [],
    primaryCluster: null,
    ...overrides,
  };
}

const CONTRADICTION = /not live|not yet live|should stay unavailable|is muted|not claiming/i;

describe("10e(3) — vendor alignment Elite surface prose", () => {
  it("a LIVE (non-locked) insight's elite surface makes no 'not live' claim", () => {
    const content = buildVendorAlignmentInsightDetailSurfaceContent({
      report: alignmentReport({ locked: false, tier: 1 }),
      surface: "elite",
    });
    const allText = [content.intro, ...content.items.map((i) => i.body)].join(" ");
    expect(CONTRADICTION.test(allText)).toBe(false);
    expect(content.intro).toContain("Elite Insights build on this Pro readout");
  });

  it("a genuinely locked (tier-2) insight still shows the honest locked boundary", () => {
    const content = buildVendorAlignmentInsightDetailSurfaceContent({
      report: alignmentReport({ key: "benchmark-comparison", locked: true, tier: 2 }),
      surface: "elite",
    });
    const allText = [content.intro, ...content.items.map((i) => i.body)].join(" ");
    expect(allText).toMatch(/not (a live|live)/i); // placeholder preserved for locked
  });
});

describe("10e(2) — self-reported puzzle piece cannot overrun its border", () => {
  it("the piece text block clips and clamps every line", () => {
    const src = read("app/components/firm/AlignmentBoardClient.tsx");
    // the centered text container clips anything past the piece rectangle
    expect(src).toContain("justify-center gap-0.5 overflow-hidden");
    // the rank / tier line (which carries the "Self-reported" tag) truncates
    expect(src).toContain("w-full truncate text-[9px]");
  });
});
