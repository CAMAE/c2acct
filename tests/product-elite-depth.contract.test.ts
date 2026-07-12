import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildProductCohortPosition, buildProductTrajectory } from "@/lib/eliteInsightsV2";

/**
 * Hybrid Elite depth: a product's cohort position is real, firm-reviewed data
 * (percentile in its category's peer-product field), and the 11e product-insight
 * Elite toggle flips LIVE for entitled vendors while staying an honest upsell for
 * non-entitled ones. A paying Elite customer never sees a locked pane.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

// A tiny mock of the Prisma slice buildProductCohortPosition needs.
function mockClient(opts: {
  peerIds: string[];
  reviews: Array<{ score: number; productId: string }>;
}) {
  return {
    product: {
      findMany: async () => opts.peerIds.map((id) => ({ id })),
    },
    surveySubmission: {
      findMany: async () =>
        opts.reviews.map((r) => ({ score: r.score, Subject: { productId: r.productId } })),
    },
  } as unknown as Parameters<typeof buildProductCohortPosition>[0];
}

describe("buildProductCohortPosition — real cohort placement", () => {
  it("places a product by percentile in its category's firm-reviewed field", async () => {
    // 6 peer products, this one (P) is mid-field.
    const peerIds = ["P", "A", "B", "C", "D", "E"];
    const reviews = [
      { score: 60, productId: "P" },
      { score: 40, productId: "A" },
      { score: 50, productId: "B" },
      { score: 70, productId: "C" },
      { score: 80, productId: "D" },
      { score: 90, productId: "E" },
    ];
    const result = await buildProductCohortPosition(mockClient({ peerIds, reviews }), {
      productId: "P",
      category: "Ledger & Close",
      boundaries: ["DEMO"] as never,
    });
    expect(result.available).toBe(true);
    expect(result.suppressed).toBe(false); // 6 ≥ MIN_CONTRIBUTORS(5)
    expect(result.score).toBe(60);
    expect(result.n).toBe(6);
    expect(result.percentile).toBeGreaterThan(0);
    expect(result.percentile).toBeLessThan(100);
    // 60 is below the p75 of {40,50,60,70,80,90}, so there is a gap to top quartile.
    expect(result.gapToTopQuartile).toBeGreaterThan(0);
  });

  it("suppresses when the category has too few reviewed peers", async () => {
    const result = await buildProductCohortPosition(
      mockClient({ peerIds: ["P", "A"], reviews: [
        { score: 60, productId: "P" },
        { score: 50, productId: "A" },
      ] }),
      { productId: "P", category: "Payroll & Workforce", boundaries: ["DEMO"] as never }
    );
    expect(result.suppressed).toBe(true); // n=2 < 5
  });

  it("returns an honest empty state before any firm review of the product", async () => {
    const result = await buildProductCohortPosition(
      mockClient({ peerIds: ["A", "B", "C", "D", "E"], reviews: [
        { score: 50, productId: "A" },
      ] }),
      { productId: "P", category: "Tax & Compliance", boundaries: ["DEMO"] as never }
    );
    expect(result.available).toBe(false);
    expect(result.emptyReason).toMatch(/after firms review/i);
  });
});

function trajClient(snaps: Array<{ score: number; computedAt: Date }>) {
  return {
    productMaturitySnapshot: { findMany: async () => snaps },
    productMaturityMomentum: { findFirst: async () => null },
  } as unknown as Parameters<typeof buildProductTrajectory>[0];
}

describe("buildProductTrajectory — real line only, honest pending otherwise", () => {
  it("stays honestly pending with fewer than two snapshots (no fabricated line)", async () => {
    const t = await buildProductTrajectory(trajClient([{ score: 60, computedAt: new Date("2026-06-15") }]), "P");
    expect(t.available).toBe(false);
    expect(t.history).toHaveLength(0);
    expect(t.emptyReason).toMatch(/holds this back|time-series|fabricated/i);
  });

  it("charts a real trajectory with >=2 snapshots + a directional projection", async () => {
    const t = await buildProductTrajectory(
      trajClient([
        { score: 50, computedAt: new Date("2026-03-15") },
        { score: 55, computedAt: new Date("2026-04-15") },
        { score: 60, computedAt: new Date("2026-05-15") },
      ]),
      "P"
    );
    expect(t.available).toBe(true);
    expect(t.history.map((h) => h.score)).toEqual([50, 55, 60]);
    expect(t.projection).not.toBeNull();
    expect(t.projection!.score).toBeGreaterThanOrEqual(60); // rising → projects up
  });
});

describe("11e flip — entitled sees live depth, non-entitled sees the upsell", () => {
  it("the page renders the live depth card for entitled and the locked preview otherwise", () => {
    const src = read("app/vendor/product-insight/[productId]/[insightKey]/page.tsx");
    // entitled + live cohort → the live depth card
    expect(src).toContain("eliteEntitled && productCohort");
    expect(src).toContain("ProductEliteDepthCard");
    // non-entitled → the honest blurred upsell
    expect(src).toContain("showEliteUpsell && activeSurface === \"elite\"");
    expect(src).toContain("LockedElitePreview");
    // the toggle shows on every tier-1 surface now (both entitlements)
    expect(src).toContain("const showEliteToggle = !isTier2");
  });

  it("the elite surface intro is entitlement-aware (live vs upsell)", () => {
    const src = read("lib/vendorProductInsightEngine.ts");
    expect(src).toContain("eliteEntitled");
    expect(src).toContain("Live product intelligence");
  });

  it("the depth card states the trend as an honest pending layer (no fabricated line)", () => {
    const src = read("app/components/insights/elite/ProductEliteDepthCard.tsx");
    expect(src).toContain("Trend");
    expect(src).toMatch(/holds this back|no.*time-series|fabricated/i);
  });
});
