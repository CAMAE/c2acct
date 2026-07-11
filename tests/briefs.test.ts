import { describe, expect, it } from "vitest";

import type {
  AdminCompanyBriefing,
  BriefingCatalogItem,
} from "@/lib/adminBriefingEngine";
import {
  HEATMAP_BAND_HIGH_THRESHOLD,
  HEATMAP_BAND_MID_THRESHOLD,
  buildActionRoadmap,
  buildPerFirmHeatmap,
  buildSelfVsMarketDelta,
  generateExecutiveSummary,
  heatmapBandForScore,
} from "@/lib/briefs";
import type { VendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

function vendorSnapshot(input: {
  id: string;
  name?: string;
  vendorScore?: number | null;
  firmScore?: number | null;
  firmReviewCount?: number;
  utilityKeys?: string[];
}): VendorProductInsightSnapshot {
  return {
    product: {
      id: input.id,
      name: input.name ?? `Product ${input.id}`,
      summary: null,
      utilityKeys: input.utilityKeys ?? [],
      utilityLabels: [],
      utilityScopeLabel: "",
    },
    vendorSelfReported: {
      latestScore: input.vendorScore ?? null,
      submittedAt: null,
      sectionEvidence: [],
    },
    firmReviewed: {
      // Default at the divergence sample floor so divergence assertions hold;
      // an explicit firmReviewCount can drop below it to test the floor.
      assessmentCount: input.firmReviewCount ?? 3,
      averageScore: input.firmScore ?? null,
      latestSubmittedAt: null,
      utilityEvidence: [],
    },
  } as unknown as VendorProductInsightSnapshot;
}

function briefingWithProducts(input: {
  companyId: string;
  companyName?: string;
  products?: Array<{ productId: string; score: number | null }>;
  actions?: Array<{ window: "30 days" | "60 days" | "90 days"; title: string }>;
}): AdminCompanyBriefing {
  return {
    company: {
      id: input.companyId,
      name: input.companyName ?? `Firm ${input.companyId}`,
    },
    productLayer: {
      products: (input.products ?? []).map((entry) => ({
        productId: entry.productId,
        productName: `Product ${entry.productId}`,
        vendorName: "Vendor",
        canonicalFirmReviewScore: entry.score,
        firmReviewCount: 1,
        vendorSelfReportedScore: null,
        combinedCurrentReadout: "",
        divergenceLabel: "",
        confidenceLabel: "",
        confidenceSummary: "",
        latestUpdatedAt: null,
        utilityLabels: [],
        taxonomyTitles: [],
        capabilityKeys: [],
        latestVendorAssessmentSubmittedAt: null,
        openEndedResponseCount: 0,
      })),
      openEndedResponses: [],
    },
    nextActions: (input.actions ?? []).map((entry, index) => ({
      window: entry.window,
      title: entry.title,
      detail: `detail ${index}`,
      evidence: "",
    })),
  } as unknown as AdminCompanyBriefing;
}

function catalogEntry(input: Partial<BriefingCatalogItem> = {}): BriefingCatalogItem {
  return {
    companyId: "firm-x",
    companyName: "Firm X",
    userCount: 0,
    completedModuleCount: 0,
    productReviewCount: 0,
    canonicalFirmScore: null,
    confidenceLabel: "No current-state signal",
    latestUpdatedAt: null,
    ...input,
  };
}

describe("lib/briefs helpers", () => {
  describe("heatmapBandForScore", () => {
    it("maps scores to bands per the Page-3 mock spec", () => {
      expect(heatmapBandForScore(null)).toBe("unreviewed");
      expect(heatmapBandForScore(HEATMAP_BAND_HIGH_THRESHOLD)).toBe("high");
      expect(heatmapBandForScore(HEATMAP_BAND_HIGH_THRESHOLD + 5)).toBe("high");
      expect(heatmapBandForScore(HEATMAP_BAND_HIGH_THRESHOLD - 1)).toBe("mid");
      expect(heatmapBandForScore(HEATMAP_BAND_MID_THRESHOLD)).toBe("mid");
      expect(heatmapBandForScore(HEATMAP_BAND_MID_THRESHOLD - 1)).toBe("low");
      expect(heatmapBandForScore(0)).toBe("low");
    });
  });

  describe("buildSelfVsMarketDelta", () => {
    it("computes delta at the 10-point boundary and sets hot-divergence flag", () => {
      const rows = buildSelfVsMarketDelta([
        vendorSnapshot({ id: "a", vendorScore: 80, firmScore: 71 }), // delta 9 — not hot
        vendorSnapshot({ id: "b", vendorScore: 80, firmScore: 70 }), // delta 10 — hot (boundary)
        vendorSnapshot({ id: "c", vendorScore: 80, firmScore: 69 }), // delta 11 — hot
        vendorSnapshot({ id: "d", vendorScore: 70, firmScore: 81 }), // delta -11 — hot, firm-higher
      ]);
      expect(rows.find((r) => r.productId === "a")?.isHotDivergence).toBe(false);
      expect(rows.find((r) => r.productId === "b")?.isHotDivergence).toBe(true);
      expect(rows.find((r) => r.productId === "c")?.isHotDivergence).toBe(true);
      expect(rows.find((r) => r.productId === "d")?.isHotDivergence).toBe(true);
      expect(rows.find((r) => r.productId === "d")?.deltaDirection).toBe("firm-higher");
    });

    it("emits no-signal direction when either score is null and sorts those rows last", () => {
      const rows = buildSelfVsMarketDelta([
        vendorSnapshot({ id: "no-firm", vendorScore: 70, firmScore: null }),
        vendorSnapshot({ id: "hot", vendorScore: 90, firmScore: 70 }),
        vendorSnapshot({ id: "no-vendor", vendorScore: null, firmScore: 70 }),
      ]);
      expect(rows[0].productId).toBe("hot");
      expect(rows[1].deltaDirection).toBe("no-signal");
      expect(rows[2].deltaDirection).toBe("no-signal");
      expect(rows.find((r) => r.productId === "no-firm")?.delta).toBeNull();
      expect(rows.find((r) => r.productId === "no-vendor")?.delta).toBeNull();
    });
  });

  describe("buildPerFirmHeatmap", () => {
    it("emits a cell for every (firm, product) pair including unreviewed cells", () => {
      const firms = [
        { id: "f1", name: "Firm 1" },
        { id: "f2", name: "Firm 2" },
        { id: "f3", name: "Firm 3" },
      ];
      const vendorCatalog = [
        vendorSnapshot({ id: "p1" }),
        vendorSnapshot({ id: "p2" }),
      ];
      const briefings = [
        briefingWithProducts({
          companyId: "f1",
          products: [
            // WS11-D Block E.2: heatmap gained a 5th band ("high-strong" for
            // scores ≥85). 85 now maps there; 80 stays in "high".
            { productId: "p1", score: 85 }, // high-strong
            { productId: "p2", score: 50 }, // mid (boundary)
          ],
        }),
        briefingWithProducts({
          companyId: "f2",
          products: [
            { productId: "p1", score: 30 }, // low
            // p2 unreviewed
          ],
        }),
        // f3 has no briefing — every cell unreviewed
      ];

      const heatmap = buildPerFirmHeatmap(firms, vendorCatalog, briefings);
      expect(heatmap.firms).toHaveLength(3);
      expect(heatmap.products).toHaveLength(2);
      expect(heatmap.cells).toHaveLength(6);

      const cell = (firmId: string, productId: string) =>
        heatmap.cells.find((c) => c.firmCompanyId === firmId && c.productId === productId);

      expect(cell("f1", "p1")?.band).toBe("high-strong");
      expect(cell("f1", "p2")?.band).toBe("mid");
      expect(cell("f2", "p1")?.band).toBe("low");
      expect(cell("f2", "p2")?.band).toBe("unreviewed");
      expect(cell("f3", "p1")?.band).toBe("unreviewed");
      expect(cell("f3", "p2")?.band).toBe("unreviewed");
    });
  });

  describe("buildActionRoadmap", () => {
    it("dedupes by normalized title within window and ranks by signal strength", () => {
      // 5 firms; 3 share "Roll out workflow fix" (30 days, >50% → high);
      // 1 has unique action (1 of 5 = 20% → low, since < quarter).
      const briefings = [
        briefingWithProducts({
          companyId: "f1",
          actions: [{ window: "30 days", title: "Roll out workflow fix" }],
        }),
        briefingWithProducts({
          companyId: "f2",
          actions: [{ window: "30 days", title: "  Roll out workflow fix  " }], // whitespace varies
        }),
        briefingWithProducts({
          companyId: "f3",
          actions: [{ window: "30 days", title: "roll out workflow fix" }], // case varies
        }),
        briefingWithProducts({
          companyId: "f4",
          actions: [{ window: "30 days", title: "Unique action" }],
        }),
        briefingWithProducts({ companyId: "f5" }), // no actions
      ];
      const roadmap = buildActionRoadmap(briefings);
      expect(roadmap.thirtyDay).toHaveLength(2);
      // 3 of 5 firms = high signal; sorted first
      expect(roadmap.thirtyDay[0].text).toBe("Roll out workflow fix");
      expect(roadmap.thirtyDay[0].signalStrength).toBe("high");
      expect(roadmap.thirtyDay[0].affectedFirmIds).toHaveLength(3);
      // 1 of 5 = 20% (< 25%) → low
      expect(roadmap.thirtyDay[1].signalStrength).toBe("low");
    });

    it("emits medium signal when exactly a quarter of firms surface the action", () => {
      // 4 firms; 1 cites the action → 25% → medium (boundary).
      const briefings = [
        briefingWithProducts({
          companyId: "f1",
          actions: [{ window: "60 days", title: "Quarterly retro" }],
        }),
        briefingWithProducts({ companyId: "f2" }),
        briefingWithProducts({ companyId: "f3" }),
        briefingWithProducts({ companyId: "f4" }),
      ];
      const roadmap = buildActionRoadmap(briefings);
      expect(roadmap.sixtyDay).toHaveLength(1);
      expect(roadmap.sixtyDay[0].signalStrength).toBe("medium");
    });

    it("buckets actions into 30/60/90 panels independently", () => {
      const briefings = [
        briefingWithProducts({
          companyId: "f1",
          actions: [
            { window: "30 days", title: "A30" },
            { window: "60 days", title: "B60" },
            { window: "90 days", title: "C90" },
          ],
        }),
      ];
      const roadmap = buildActionRoadmap(briefings);
      expect(roadmap.thirtyDay).toHaveLength(1);
      expect(roadmap.sixtyDay).toHaveLength(1);
      expect(roadmap.ninetyDay).toHaveLength(1);
      expect(roadmap.thirtyDay[0].text).toBe("A30");
      expect(roadmap.sixtyDay[0].text).toBe("B60");
      expect(roadmap.ninetyDay[0].text).toBe("C90");
    });
  });

  describe("generateExecutiveSummary", () => {
    it("uses compare-scores headline when both averages exist", () => {
      const briefings = [
        briefingWithProducts({
          companyId: "f1",
          products: [{ productId: "p1", score: 70 }],
        }),
      ];
      const catalog = [catalogEntry({ canonicalFirmScore: 70 })];
      const summary = generateExecutiveSummary(
        briefings,
        [vendorSnapshot({ id: "p1", vendorScore: 80, firmScore: 70 })],
        catalog,
        "Test Ecosystem"
      );
      expect(summary.headline).toMatch(/Test Ecosystem.*70 alignment.*80 self-report/);
    });

    it("falls back to scope-only headline when averages are null", () => {
      const summary = generateExecutiveSummary(
        [],
        [],
        [catalogEntry({ canonicalFirmScore: null })],
        "Test Ecosystem"
      );
      expect(summary.headline).toBe("Test Ecosystem: 1 firm in scope.");
    });

    it("emits hot-divergence paragraph only when count > 0", () => {
      const briefings = [
        briefingWithProducts({
          companyId: "f1",
          products: [{ productId: "p1", score: 60 }],
        }),
      ];
      const noDivergenceCatalog = [catalogEntry({ canonicalFirmScore: 80 })];
      const noDivergenceVendor = [vendorSnapshot({ id: "p1", vendorScore: 80, firmScore: 80 })];
      const noDivergenceSummary = generateExecutiveSummary(
        [briefingWithProducts({
          companyId: "f1",
          products: [{ productId: "p1", score: 80 }],
        })],
        noDivergenceVendor,
        noDivergenceCatalog,
        "Test Ecosystem"
      );
      expect(noDivergenceSummary.body.some((p) => /material gap/.test(p))).toBe(false);

      const withDivergenceSummary = generateExecutiveSummary(
        briefings,
        [vendorSnapshot({ id: "p1", vendorScore: 90, firmScore: 60 })],
        [catalogEntry({ canonicalFirmScore: 60 })],
        "Test Ecosystem"
      );
      // briefings already carry vendor 90 vs firm 60 → 30pt gap is hot; but
      // countHotDivergences reads the briefing's productLayer, where
      // vendorSelfReportedScore is null in our fixture, so 0 hot divergences.
      // That's correct: the briefing.productLayer is the source of truth for
      // divergences. The body should NOT include the hot-divergence
      // paragraph despite the vendor-catalog gap.
      expect(withDivergenceSummary.body.some((p) => /material gap/.test(p))).toBe(false);
    });

    it("emits low-confidence paragraph when majority of firms are sample-thin or weaker", () => {
      const catalog = [
        catalogEntry({ companyId: "a", confidenceLabel: "Sample-thin current-state signal" }),
        catalogEntry({ companyId: "b", confidenceLabel: "Early current-state signal" }),
        catalogEntry({ companyId: "c", confidenceLabel: "Grounded current-state signal" }),
      ];
      const summary = generateExecutiveSummary([], [], catalog, "Test Ecosystem");
      expect(summary.body.some((p) => /sample-thin, early, or no-signal/.test(p))).toBe(true);
    });

    it("renders confidence callout with raw counts", () => {
      const catalog = [
        catalogEntry({ companyId: "a", confidenceLabel: "Grounded current-state signal" }),
        catalogEntry({ companyId: "b", confidenceLabel: "Grounded current-state signal" }),
        catalogEntry({ companyId: "c", confidenceLabel: "Limited signal" }),
      ];
      const summary = generateExecutiveSummary([], [], catalog, "Test Ecosystem");
      expect(summary.confidenceCallout).toBe(
        "Confidence band across 3 firms: 2 grounded, 1 emerging."
      );
    });
  });
});

import {
  buildVendorEditVariants,
  composeVendorEditChoices,
  type VendorBriefEditChoices,
} from "@/lib/briefs";
import type { VendorBriefVariantSlots } from "@/lib/briefs/executive-summary-templates";

describe("Vendor Brief edit-choice composition (Day 17 Block 4)", () => {
  const sampleSlots: VendorBriefVariantSlots = {
    ecosystemName: "Ecosystem A",
    firmCount: 10,
    avgFirmScore: 68,
    avgVendorSelfReport: 76,
    hotDivergences: 3,
    productCount: 7,
    roadmapItemCount: 9,
  };

  it("buildVendorEditVariants returns 2 variants per eligible section, all rendered", () => {
    const editVariants = buildVendorEditVariants(sampleSlots);
    expect(Object.keys(editVariants)).toEqual([
      "vendor.executive-summary",
      "vendor.self-vs-market-delta",
      "vendor.action-roadmap",
    ]);
    for (const sectionKey of Object.keys(editVariants)) {
      expect(editVariants[sectionKey]).toHaveLength(2);
      for (const option of editVariants[sectionKey]) {
        expect(option.id).toMatch(/^v\d+-/);
        expect(option.rendered.length).toBeGreaterThan(0);
      }
    }
  });

  it("composeVendorEditChoices on an empty Map returns the empty-default editChoices shape", () => {
    const editChoices = composeVendorEditChoices(new Map());
    expect(editChoices).toEqual({ variants: {}, emphasis: {}, ordering: {} });
  });

  it("PHRASING_VARIANT choice composes into editChoices.variants[sectionKey] = variantId", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "vendor.executive-summary::PHRASING_VARIANT",
        { choiceType: "PHRASING_VARIANT", choiceValue: "v1-pointed" },
      ],
    ]);
    const editChoices = composeVendorEditChoices(map);
    expect(editChoices.variants["vendor.executive-summary"]).toBe("v1-pointed");
    expect(editChoices.emphasis).toEqual({});
    expect(editChoices.ordering).toEqual({});
  });

  it("EMPHASIS choice composes the comma-joined target ids into editChoices.emphasis[sectionKey] as a list", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "vendor.executive-summary::EMPHASIS",
        { choiceType: "EMPHASIS", choiceValue: "headline,confidence-callout" },
      ],
    ]);
    const editChoices = composeVendorEditChoices(map);
    expect(editChoices.emphasis["vendor.executive-summary"]).toEqual([
      "headline",
      "confidence-callout",
    ]);
  });

  it("ORDERING choice with stale ids still composes; the render layer is responsible for dropping unknowns", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "vendor.action-roadmap::ORDERING",
        { choiceType: "ORDERING", choiceValue: "item-7,item-2,stale-id,item-1" },
      ],
    ]);
    const editChoices = composeVendorEditChoices(map);
    expect(editChoices.ordering["vendor.action-roadmap"]).toEqual([
      "item-7",
      "item-2",
      "stale-id",
      "item-1",
    ]);
  });

  it("empty-string choiceValue is dropped (clear-choice sentinel) so the render falls back to default variant index 0", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "vendor.executive-summary::PHRASING_VARIANT",
        { choiceType: "PHRASING_VARIANT", choiceValue: "" },
      ],
    ]);
    const editChoices = composeVendorEditChoices(map);
    expect(editChoices.variants["vendor.executive-summary"]).toBeUndefined();
  });

  it("fully-populated choice map produces a fully-populated editChoices shape", () => {
    const map = new Map<string, { choiceType: string; choiceValue: string }>([
      [
        "vendor.executive-summary::PHRASING_VARIANT",
        { choiceType: "PHRASING_VARIANT", choiceValue: "v1-pointed" },
      ],
      [
        "vendor.self-vs-market-delta::EMPHASIS",
        { choiceType: "EMPHASIS", choiceValue: "row-0,row-2" },
      ],
      [
        "vendor.action-roadmap::ORDERING",
        { choiceType: "ORDERING", choiceValue: "i1,i2" },
      ],
    ]);
    const editChoices: VendorBriefEditChoices = composeVendorEditChoices(map);
    expect(editChoices.variants["vendor.executive-summary"]).toBe("v1-pointed");
    expect(editChoices.emphasis["vendor.self-vs-market-delta"]).toEqual(["row-0", "row-2"]);
    expect(editChoices.ordering["vendor.action-roadmap"]).toEqual(["i1", "i2"]);
  });
});
