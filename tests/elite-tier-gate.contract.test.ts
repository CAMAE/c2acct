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
      file: "app/firm/insights/[key]/page.tsx",
      resolve: 'resolveMembershipEntitlement(sessionUser, "firm", MEMBERSHIP_PLAN.ELITE)',
      renderFn: "renderFirmEliteSurface",
    },
    {
      file: "app/vendor/alignment-insights/[key]/page.tsx",
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
