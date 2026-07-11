import { describe, expect, it } from "vitest";
import { percentileValue, percentileRank } from "@/lib/benchmarks";
import { buildVendorGapMap, type GapMapProductInput } from "@/lib/eliteInsightsV2";

/**
 * Elite Insights v2 (verdict §4) — contract for the pure logic: percentile math
 * (F1/V1), the V3 divergence-floor + tone rules, and the Elite hub reachability.
 * DB-backed surfaces (F1/F2/F3/V1/V2 readers) are verified live via HTTP against
 * the running preview per the standing rule.
 */

describe("percentile math (F1/V1 dark data)", () => {
  it("percentileValue interpolates the distribution", () => {
    const v = [10, 20, 30, 40, 50];
    expect(percentileValue(v, 0)).toBe(10);
    expect(percentileValue(v, 100)).toBe(50);
    expect(percentileValue(v, 50)).toBe(30);
    expect(percentileValue([], 50)).toBeNull();
  });

  it("percentileRank = % of the cohort at or below you", () => {
    const v = [10, 20, 30, 40, 50];
    expect(percentileRank(v, 30)).toBe(60); // 3 of 5 at or below
    expect(percentileRank(v, 50)).toBe(100);
    expect(percentileRank(v, 5)).toBe(0);
  });
});

describe("V3 Alignment Gap Map — divergence floor + tone", () => {
  const dims = (firm: number | null, vendor: number | null) => ({
    firmDimensions: [{ key: "workflow", title: "Workflow Fit", score: firm }],
    vendorDimensions: [{ key: "workflow", title: "Workflow Fit", score: vendor }],
  });

  it("suppresses cells below the 3-firm-review divergence floor (tone none)", () => {
    const products: GapMapProductInput[] = [
      { productId: "p1", productName: "Ledger", firmAssessmentCount: 2, ...dims(60, 90) },
    ];
    const map = buildVendorGapMap(products);
    // whole surface unavailable when no product clears the floor
    expect(map.available).toBe(false);
    expect(map.emptyReason).toMatch(/3 firm reviews/);
  });

  it("flags dispute when the vendor rates itself well above firms; confirm when firms match/exceed", () => {
    const products: GapMapProductInput[] = [
      { productId: "p1", productName: "Ledger", firmAssessmentCount: 5, ...dims(55, 90) }, // vendor +35 → dispute
      { productId: "p2", productName: "Recon", firmAssessmentCount: 5, ...dims(80, 78) }, // firms confirm
    ];
    const map = buildVendorGapMap(products);
    expect(map.available).toBe(true);
    expect(map.rows[0].cells[0].tone).toBe("dispute");
    expect(map.rows[1].cells[0].tone).toBe("confirm");
  });
});

describe("reachability — Elite hub cards live for Elite viewers", () => {
  it("firm: Elite viewers get interactive cards linking to each ?surface=elite; Pro stays locked", async () => {
    const { buildFirmEliteInsightCards } = await import("@/lib/firmInsightEngine");
    const live = buildFirmEliteInsightCards({ elite: true });
    expect(live.length).toBe(3);
    for (const card of live) {
      expect(card.interactive).toBe(true);
      expect(card.href).toBe(`/firm/insights/${card.key}?surface=elite`);
    }
    const locked = buildFirmEliteInsightCards({ elite: false });
    for (const card of locked) expect(card.href).toBeNull();
  });

  it("vendor: Elite viewers get interactive cards; Pro stays locked", async () => {
    const { buildVendorAlignmentInsightBundle, buildVendorAlignmentEliteInsightCards } = await import(
      "@/lib/vendorAlignmentInsightEngine"
    );
    const bundle = buildVendorAlignmentInsightBundle({
      sampleSize: 6,
      submissionCount: 6,
      moduleAggregates: [],
      capabilityAggregates: [],
      questionClusters: [],
    });
    const live = buildVendorAlignmentEliteInsightCards(bundle, { elite: true });
    expect(live.length).toBe(3);
    for (const card of live) {
      expect(card.interactive).toBe(true);
      expect(card.href).toBe(`/vendor/alignment-insights/${card.key}?surface=elite`);
    }
    const locked = buildVendorAlignmentEliteInsightCards(bundle, { elite: false });
    for (const card of locked) expect(card.href).toBeNull();
  });
});
