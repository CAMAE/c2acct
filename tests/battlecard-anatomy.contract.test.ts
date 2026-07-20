import { describe, expect, it } from "vitest";
import { buildBattleCardAnatomy } from "@/lib/battleCard";
import type { BriefingProductSummary, BriefingRiskOpportunity } from "@/lib/adminBriefingEngine";

/**
 * Block 17 Track B / B1 — the four-block BattleCard v2 anatomy (Day-23 §D23-P0).
 * Pins: every block is grounded (N>=2 review floor), bullet-capped (3/3/4/2),
 * honest-empty when ungrounded, and never fabricated. Discovery uses the shared
 * question engine; objection prep = real risks[] + large vendor-higher gaps.
 */

function product(p: Partial<BriefingProductSummary> & { productId: string; productName: string }): BriefingProductSummary {
  return {
    vendorName: "Meridian",
    canonicalFirmReviewScore: null,
    firmReviewCount: 0,
    vendorSelfReportedScore: null,
    combinedCurrentReadout: "",
    divergenceLabel: "",
    confidenceLabel: "",
    confidenceSummary: "",
    latestUpdatedAt: null,
    utilityLabels: ["Workflow"],
    taxonomyTitles: ["Workflow & Practice Ops"],
    capabilityKeys: [],
    latestVendorAssessmentSubmittedAt: null,
    openEndedResponseCount: 0,
    ...p,
  };
}

const NO_RISKS: BriefingRiskOpportunity[] = [];
const base = { freshness: null, vendorName: "Meridian", firmName: "Kirkland Reyes" };

describe("buildBattleCardAnatomy", () => {
  it("high-band firm reviews (N>=2) feed 'why it fits', capped at 3", () => {
    const products = [90, 85, 80, 78].map((s, i) =>
      product({ productId: `p${i}`, productName: `Product ${i}`, canonicalFirmReviewScore: s, firmReviewCount: 3 })
    );
    const a = buildBattleCardAnatomy({ ...base, products, risks: NO_RISKS });
    expect(a.whyItFits).toHaveLength(3);
    expect(a.whyItFits[0]).toContain("Product 0"); // strongest first (90)
    expect(a.whyItFits.every((s) => s.includes("proven strength"))).toBe(true);
  });

  it("respects the N>=2 sample floor — a single-review product is never asserted", () => {
    const products = [product({ productId: "p1", productName: "Solo", canonicalFirmReviewScore: 92, firmReviewCount: 1 })];
    const a = buildBattleCardAnatomy({ ...base, products, risks: NO_RISKS });
    expect(a.whyItFits).toEqual(["No high-band products yet — fit is emerging at the mid-band."]);
    expect(a.discoveryQuestions[0]).toMatch(/Complete a product review/);
  });

  it("low-band reviews and large calibration gaps feed risk flags (cap 3)", () => {
    const products = [
      product({ productId: "low", productName: "Weak", canonicalFirmReviewScore: 40, firmReviewCount: 4, vendorSelfReportedScore: 42 }),
      product({ productId: "gap", productName: "Overclaimed", canonicalFirmReviewScore: 60, firmReviewCount: 4, vendorSelfReportedScore: 85 }),
    ];
    const a = buildBattleCardAnatomy({ ...base, products, risks: NO_RISKS });
    expect(a.riskFlags.length).toBeGreaterThanOrEqual(2);
    expect(a.riskFlags.length).toBeLessThanOrEqual(3);
    expect(a.riskFlags.some((s) => s.includes("Weak") && s.includes("below the mid-band"))).toBe(true);
    expect(a.riskFlags.some((s) => s.includes("Overclaimed") && s.includes("calibration gap"))).toBe(true);
  });

  it("discovery questions come from the shared engine, capped at 4", () => {
    const products = [70, 55, 45, 82, 90].map((s, i) =>
      product({ productId: `p${i}`, productName: `Prod ${i}`, canonicalFirmReviewScore: s, firmReviewCount: 3, vendorSelfReportedScore: s + 12 })
    );
    const a = buildBattleCardAnatomy({ ...base, products, risks: NO_RISKS });
    expect(a.discoveryQuestions.length).toBeGreaterThan(0);
    expect(a.discoveryQuestions.length).toBeLessThanOrEqual(4);
  });

  it("objection prep = real briefing risks + large vendor-higher gaps, capped at 2", () => {
    const risks: BriefingRiskOpportunity[] = [
      { layer: "product", title: "Integration depth is unproven at scale", detail: "" },
      { layer: "ecosystem", title: "ignored — not firm/product layer", detail: "" },
    ];
    const products = [product({ productId: "d", productName: "Disq", canonicalFirmReviewScore: 40, firmReviewCount: 3, vendorSelfReportedScore: 80 })];
    const a = buildBattleCardAnatomy({ ...base, products, risks });
    expect(a.objectionPrep.length).toBeLessThanOrEqual(2);
    expect(a.objectionPrep[0]).toBe("Integration depth is unproven at scale");
    expect(a.objectionPrep.some((s) => s.includes("Disq"))).toBe(true);
    // ecosystem-layer risk is NOT a per-firm objection.
    expect(a.objectionPrep.some((s) => s.includes("ignored"))).toBe(false);
  });

  it("all four blocks are honest-empty (never fabricated) when there is no grounded data", () => {
    const a = buildBattleCardAnatomy({ ...base, products: [], risks: NO_RISKS });
    expect(a.whyItFits).toHaveLength(1);
    expect(a.riskFlags).toHaveLength(1);
    expect(a.discoveryQuestions).toHaveLength(1);
    expect(a.objectionPrep).toEqual(["No category-level disqualifiers surface for this firm."]);
  });

  it("stale evidence surfaces as a risk when nothing else fills the third slot", () => {
    const a = buildBattleCardAnatomy({
      ...base,
      products: [],
      risks: NO_RISKS,
      freshness: { state: "stale", ageDays: 400, asOfIso: "", ageLabel: "400 days ago", asOfLabel: "" },
    });
    expect(a.riskFlags.some((s) => s.includes("stale"))).toBe(true);
  });
});
