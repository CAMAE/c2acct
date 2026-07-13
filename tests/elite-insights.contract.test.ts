import { describe, expect, it } from "vitest";
import { percentileValue, percentileRank } from "@/lib/benchmarks";
import {
  buildFirmThemeDepth,
  buildGapMapDrilldownInsight,
  buildVendorGapMap,
  firmEliteHubMetrics,
  vendorEliteHubMetrics,
  type FirmPeerPosition,
  type GapMapProductInput,
} from "@/lib/eliteInsightsV2";

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

describe("V3 Gap Map drill-down — takeaway + action from the selection", () => {
  it("anchors on the WIDEST dispute across selected product×dimension pairs", () => {
    const insight = buildGapMapDrilldownInsight([
      { productLabel: "Ledger Pro", dimLabel: "Workflow Fit", firm: 70, vendor: 80 }, // gap +10
      { productLabel: "Recon", dimLabel: "Data Controls", firm: 55, vendor: 90 }, // gap +35 (widest)
      { productLabel: "Recon", dimLabel: "Support", firm: null, vendor: 88 }, // unscored, ignored
    ]);
    expect(insight).not.toBeNull();
    expect(insight!.takeaway).toContain("Recon");
    expect(insight!.takeaway).toContain("Data Controls");
    expect(insight!.takeaway).toContain("35 points");
    expect(insight!.action).toContain("Recon");
  });

  it("flips to a lead-with signal when firms confirm everywhere (no positive gap)", () => {
    const insight = buildGapMapDrilldownInsight([
      { productLabel: "Recon", dimLabel: "Data Controls", firm: 82, vendor: 78 }, // firms above
    ]);
    expect(insight!.takeaway).toMatch(/confirm your story/);
    expect(insight!.action).toMatch(/Lead with/);
  });

  it("returns null when no selected pair has both a firm read and a self-report", () => {
    expect(
      buildGapMapDrilldownInsight([{ productLabel: "Recon", dimLabel: "Support", firm: null, vendor: 80 }])
    ).toBeNull();
  });
});

describe("Block 12b — firm tier-1 hybrid Elite depth (theme-scoped peer position)", () => {
  const peer = (): FirmPeerPosition => ({
    available: true,
    overall: { percentile: 60, rankFromTop: 40, n: 100, score: 66 },
    bestAction: { moduleLabel: "Automation and AI Readiness", deficit: 12, fromPercentile: 40, toPercentile: 75 },
    rows: [
      { key: "m_ops", label: "Operating Model", p25: 55, p50: 65, p75: 75, p90: 85, score: 60, percentile: 45 },
      { key: "m_auto", label: "Automation", p25: 50, p50: 60, p75: 72, p90: 82, score: 54, percentile: 30 },
      { key: "m_other", label: "Other", p25: 55, p50: 65, p75: 75, p90: 85, score: 70, percentile: 60, suppressed: true },
    ],
    reportCard: [],
    emptyReason: null,
  });

  it("scopes to the theme's modules and picks the biggest gap to the peer top quartile", () => {
    const depth = buildFirmThemeDepth(peer(), ["m_ops", "m_auto"]);
    expect(depth.available).toBe(true);
    expect(depth.rows.map((r) => r.key)).toEqual(["m_ops", "m_auto"]);
    // Automation is furthest below its p75 (72 - 54 = 18 > Operating 75 - 60 = 15)
    expect(depth.rankedAction?.moduleLabel).toBe("Automation");
    expect(depth.rankedAction?.deficit).toBe(18);
  });

  it("drops suppressed rows and reports unavailable when the theme clears no safe-harbor module", () => {
    const depth = buildFirmThemeDepth(peer(), ["m_other"]);
    expect(depth.available).toBe(false);
    expect(depth.emptyReason).toMatch(/Not enough peer data/);
  });
});

describe("Block 12c — Elite hub face metrics (own headline number per card)", () => {
  it("firm hub metrics: trajectory index+projection, peer percentile, gap pts-to-top-quartile", () => {
    const metrics = firmEliteHubMetrics({
      peer: {
        available: true,
        overall: { percentile: 72, rankFromTop: 30, n: 106, score: 68 },
        bestAction: { moduleLabel: "Automation and AI Readiness", deficit: 9, fromPercentile: 48, toPercentile: 75 },
        rows: [],
        reportCard: [],
        emptyReason: null,
      },
      gapPlan: { available: true, gaps: [], watchList: [], clearedCount: 7, totalCount: 10, emptyReason: null },
      trajectory: {
        available: true,
        history: [{ label: "Feb", score: 60 }, { label: "Jul", score: 68 }],
        projection: { score: 85, low: 78, high: 92, label: "next" },
        momentum: null,
        swapMovement: null,
        emptyReason: null,
      },
    });
    expect(metrics.firm_tier2_projection?.value).toBe("68 · +17 projected");
    expect(metrics.firm_tier2_benchmark?.value).toBe("72nd percentile");
    expect(metrics.firm_tier2_recommendation?.value).toBe("9 pts to top quartile");
  });

  it("vendor hub metrics: category top-band, demand net motion, gap-map confirmed vs lower", () => {
    const metrics = vendorEliteHubMetrics({
      category: {
        available: true,
        categories: [
          { category: "Tax & Compliance", mean: 70, stdev: 5, p25: 60, p75: 80, score: 82, percentile: 90, rankFromTop: 1, n: 9, quartile: 4, suppressed: false },
          { category: "Ledger & Close", mean: 65, stdev: 5, p25: 55, p75: 75, score: 62, percentile: 40, rankFromTop: 5, n: 8, quartile: 2, suppressed: false },
        ],
        topAction: null,
        emptyReason: null,
      },
      demand: {
        available: true,
        identityAllowed: true,
        windowLabel: "last 90 days",
        earlySignal: false,
        totalIn: 42,
        totalOut: 15,
        swappedIn: [],
        swappedOut: [],
        rankedAction: null,
        emptyReason: null,
      },
      gapMap: buildVendorGapMap([
        { productId: "p1", productName: "Ledger", firmAssessmentCount: 5, firmDimensions: [{ key: "w", title: "Workflow", score: 80 }], vendorDimensions: [{ key: "w", title: "Workflow", score: 78 }] },
        { productId: "p2", productName: "Recon", firmAssessmentCount: 5, firmDimensions: [{ key: "w", title: "Workflow", score: 55 }], vendorDimensions: [{ key: "w", title: "Workflow", score: 90 }] },
      ]),
    });
    expect(metrics["benchmark-comparison"]?.value).toBe("1 in top band");
    expect(metrics["forward-projection"]?.value).toBe("+27 net motion");
    expect(metrics["scenario-simulation"]?.value).toBe("1 confirmed · 1 read lower");
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
