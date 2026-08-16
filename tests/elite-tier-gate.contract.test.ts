import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  MEMBERSHIP_PLAN,
  MEMBERSHIP_STATUS,
  NO_MEMBERSHIP,
  hasMembershipAccess,
  isMembershipSnapshotEntitled,
} from "@/lib/membership";
import { buildVendorDemandSignals } from "@/lib/eliteInsightsV2";

/**
 * Block 10b (P0): a non-Elite account must NEVER receive live Elite data via a
 * direct route — the server-side entitlement check gates every Elite surface,
 * and the non-entitled branch renders LockedElitePreview, never data. Both
 * directions are locked here so a future edit that drops the gate fails the
 * build. Closes the 2026-04-12 "direct-route lock" audit item.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("Elite tier gate — plan-rank access (both directions)", () => {
  it("PRO can never clear the ELITE gate", () => {
    expect(hasMembershipAccess(MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE)).toBe(false);
  });

  it("NO_MEMBERSHIP and FREE can never clear the ELITE gate", () => {
    expect(hasMembershipAccess(NO_MEMBERSHIP, MEMBERSHIP_PLAN.ELITE)).toBe(false);
    expect(hasMembershipAccess(MEMBERSHIP_PLAN.FREE, MEMBERSHIP_PLAN.ELITE)).toBe(false);
    expect(hasMembershipAccess(undefined, MEMBERSHIP_PLAN.ELITE)).toBe(false);
  });

  it("only ELITE clears the ELITE gate", () => {
    expect(hasMembershipAccess(MEMBERSHIP_PLAN.ELITE, MEMBERSHIP_PLAN.ELITE)).toBe(true);
  });

  it("an active PRO membership is entitled to Pro but not to Elite data", () => {
    const proActive = {
      status: MEMBERSHIP_STATUS.ACTIVE,
      subscription: null,
    };
    expect(isMembershipSnapshotEntitled(proActive)).toBe(true); // status-entitled
    // …but the Elite gate still denies it:
    expect(hasMembershipAccess(MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE)).toBe(false);
  });
});

describe("Elite tier gate — every Elite detail route checks server-side", () => {
  // Each Elite detail route must (1) resolve the ELITE entitlement server-side,
  // (2) only render the real Elite surface when that entitlement is allowed, and
  // (3) render LockedElitePreview (not data) on the non-entitled branch.
  const eliteRoutes = [
    {
      file: "app/(app)/firm/insights/[key]/page.tsx",
      resolve: 'resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.ELITE)',
      renderFn: "renderFirmEliteSurface",
    },
    {
      file: "app/(app)/vendor/alignment-insights/[key]/page.tsx",
      resolve: 'resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.ELITE)',
      renderFn: "renderVendorEliteSurface",
    },
  ];

  for (const route of eliteRoutes) {
    it(`${route.file} gates ${route.renderFn} on the ELITE entitlement`, () => {
      const src = read(route.file);
      // (1) resolves ELITE entitlement server-side
      expect(src, "resolves ELITE entitlement").toContain(route.resolve);
      // (2) the elite surface render is guarded by an entitlement.allowed check
      const guardRe = new RegExp(`eliteEntitlement\\.allowed[^\\n]*\\n[^\\n]*${route.renderFn}|isElite[\\s\\S]{0,60}${route.renderFn}`);
      expect(guardRe.test(src), `${route.renderFn} is guarded by eliteEntitlement.allowed`).toBe(true);
      // (3) the non-entitled branch renders LockedElitePreview (no data)
      expect(src, "non-entitled branch renders LockedElitePreview").toContain("LockedElitePreview");
    });
  }

  it("vendor product intelligence exposes no Elite data route (no elite mode)", () => {
    const src = read("lib/vendorProductInsightEngine.ts");
    // ?mode=elite coerces to pro — there is no live Elite product surface to leak.
    expect(src).toContain("case \"elite\":");
    expect(src).toContain("return \"pro\";");
  });
});

describe("Demand Signals — data classification wall (counts=Pro, identity=Elite)", () => {
  // Cam 2026-07-12: aggregate per-category swap COUNTS are Pro-tier (the teaser
  // that sells Elite). TREND arrows, TOP-PRODUCT, and the RANKED ACTION are
  // Elite-classified. The P0 direct-route wall stands: a non-entitled (Pro)
  // projection must NEVER carry the Elite-classified fields. buildVendorDemandSignals
  // strips them to null when identityAllowed=false, so the Pro render path never
  // even receives them.
  const mockClient = {
    product: {
      findMany: async () => [{ id: "p1", name: "Ledger Pro", category: "Ledger & Close" }],
    },
    sandboxSwapEvent: {
      findMany: async ({ where }: { where: { vendorInId?: string } }) =>
        where.vendorInId
          ? [{ productInId: "p1", createdAt: new Date() }]
          : [{ productOutId: "p1", createdAt: new Date() }],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;

  it("PRO projection renders COUNTS ONLY — no trend, top-product, or ranked action", async () => {
    const pro = await buildVendorDemandSignals(mockClient, "v1", ["DEMO" as never], { identityAllowed: false });
    expect(pro.available).toBe(true);
    expect(pro.identityAllowed).toBe(false);
    // counts ARE present (the Pro-tier teaser)
    expect(pro.totalIn).toBeGreaterThan(0);
    expect(pro.swappedIn.every((row) => row.count > 0)).toBe(true);
    // Elite-classified fields are stripped, on every row and the surface
    expect(pro.rankedAction).toBeNull();
    for (const row of [...pro.swappedIn, ...pro.swappedOut]) {
      expect(row.trend, "no trend for non-entitled").toBeNull();
      expect(row.topProduct, "no product identity for non-entitled").toBeNull();
    }
  });

  it("ELITE projection renders ALL — counts, trend, top-product, and ranked action", async () => {
    const elite = await buildVendorDemandSignals(mockClient, "v1", ["DEMO" as never], { identityAllowed: true });
    expect(elite.identityAllowed).toBe(true);
    // same counts as Pro (classification, not a different dataset)
    expect(elite.totalIn).toBeGreaterThan(0);
    expect(elite.rankedAction).toBeTruthy();
    for (const row of [...elite.swappedIn, ...elite.swappedOut]) {
      expect(row.trend).not.toBeNull();
      expect(row.topProduct).not.toBeNull();
    }
  });
});
