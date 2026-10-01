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
  it("a LIVE (non-locked) insight has no Elite surface (box 3h): 'elite' yields the Pro content with no 'not live' claim", () => {
    const content = buildVendorAlignmentInsightDetailSurfaceContent({
      report: alignmentReport({ locked: false, tier: 1 }),
      surface: "elite",
    });
    const allText = [content.intro, ...content.items.map((i) => i.body)].join(" ");
    expect(content.title).toBe("Pro");
    expect(allText).not.toContain("What Elite adds here");
    expect(allText).not.toMatch(/not yet live|should stay unavailable/i); // the Pro limits may say "not claiming"; no Elite-tab claim remains
  });

  it("a genuinely locked (tier-2) insight still shows the honest locked boundary", () => {
    const content = buildVendorAlignmentInsightDetailSurfaceContent({
      report: alignmentReport({ key: "benchmark-comparison", locked: true, tier: 2 }),
      surface: "elite",
    });
    const allText = [content.intro, ...content.items.map((i) => i.body)].join(" ");
    expect(allText).toContain("no live Pro readout"); // the locked boundary stays honest (box 3h: Pro content only)
  });
});

describe("10e(2) — self-reported puzzle piece cannot overrun its border", () => {
  it("the piece text wraps inside a wide piece and never truncates (box 3f item J, S5)", () => {
    const src = read("app/components/firm/AlignmentBoardClient.tsx");
    // Box 3f item J: no clamps and no truncation on the piece text; the pieces are wide
    // enough (three per row, 272px columns) for names, tier tags and deltas to wrap.
    const pieceText = src.slice(src.indexOf('data-testid="piece-text"') - 200, src.indexOf('data-testid="piece-text"') + 900);
    expect(pieceText).not.toMatch(/truncate|line-clamp-/);
    expect(pieceText).toContain('text-[12px] font-semibold uppercase tracking-[0.1em]');
    expect(src).toContain("if (count <= 3) return Math.max(1, count);\n  return 3;");
    expect(src).toContain("maxWidth: `${stackCols * 272}px`");
    // the "Self-reported" tier tag still renders on the rank line
    expect(pieceText).toContain("{tierLabel ? ` · ${tierLabel}` : \"\"}");
  });
});
