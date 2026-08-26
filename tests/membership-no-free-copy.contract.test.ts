import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEMBERSHIP_PLAN, NO_MEMBERSHIP, normalizeMembershipPlan } from "@/lib/membership";
import { getMembershipPageModel, type MembershipTabKey } from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";
import {
  getPublicOnboardingPageModel,
  type PublicOnboardingAudience,
} from "@/lib/publicOnboarding";

/**
 * Contract test (Elite Sprint Block C): FREE is dead in every user-facing
 * membership + onboarding surface. The enum keeps FREE as a rank-0 technical
 * artifact (toDbMembershipPlan display baseline, admin tooling) but it must never
 * render — no "Free" tier, and no "Free tier"/"Free plan" copy anywhere the
 * customer can see. Cam has killed FREE repeatedly; this keeps it dead.
 */

const FREE_COPY = /free\s+(tier|plan)/i;
const MEMBERSHIP_AUDIENCES: MembershipAudience[] = ["vendor", "firm", "individual"];
const MEMBERSHIP_TABS: MembershipTabKey[] = [MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.ELITE, "HELP"];
const ONBOARDING_AUDIENCES: PublicOnboardingAudience[] = ["vendor", "firm", "user"];

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, out);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) collectStrings(item, out);
  }
  return out;
}

describe("no FREE tier in user-facing membership copy", () => {
  for (const audience of MEMBERSHIP_AUDIENCES) {
    for (const activeTab of MEMBERSHIP_TABS) {
      it(`${audience}/${activeTab}: renders no FREE tier and no "Free tier"/"Free plan" copy`, () => {
        const model = getMembershipPageModel({
          audience,
          // Start from a FREE current plan — the worst case for a leak.
          currentPlan: MEMBERSHIP_PLAN.FREE,
          activeTab,
        });

        // No rendered tier is FREE, and none is literally labelled "Free".
        expect(model.tiers.some((tier) => tier.plan === MEMBERSHIP_PLAN.FREE)).toBe(false);
        expect(model.tiers.some((tier) => /^free$/i.test(tier.label))).toBe(false);

        // Scan all rendered copy: tier cards, the active panel, and the
        // comparison table's category + feature labels.
        const rendered = collectStrings({
          tiers: model.tiers,
          panel: model.panel,
          comparison: model.comparisonTable.map((row) => ({
            category: row.category,
            feature: row.feature,
          })),
        });
        const offenders = rendered.filter((text) => FREE_COPY.test(text));
        expect(offenders).toEqual([]);
      });
    }
  }
});

describe("no FREE tier in public onboarding copy", () => {
  for (const audience of ONBOARDING_AUDIENCES) {
    it(`${audience}: onboarding renders no "Free" plan card or FREE copy`, () => {
      // Even an explicit ?plan=free selection must not surface FREE copy.
      const model = getPublicOnboardingPageModel({ audience, selectedPlan: "free" });

      expect(model.planCards.some((card) => /^free$/i.test(card.label))).toBe(false);
      expect(model.planCards.some((card) => (card.key as string) === "free")).toBe(false);
      expect(/^free$/i.test(model.selectedPlanLabel)).toBe(false);

      const offenders = collectStrings({
        planCards: model.planCards,
        selectedPlanLabel: model.selectedPlanLabel,
      }).filter((text) => FREE_COPY.test(text));
      expect(offenders).toEqual([]);
    });
  }
});

describe("FREE structural retirement (AUDIT-OMNIBUS-A-001)", () => {
  it("FREE is not an assignable plan option", () => {
    // Admin surfaces render this list as a <select>. FREE being absent is what
    // makes the tier unassignable going forward; the DB enum value still exists
    // for historical rows, which is why this asserts the OPTIONS, not the enum.
    //
    // Read as source rather than imported: lib/adminControlPlane pulls the
    // next-auth chain, which does not resolve under vitest. Restructuring
    // product code to suit the test runner would be the wrong trade.
    const source = readFileSync(path.join(process.cwd(), "lib/adminControlPlane.ts"), "utf8");
    const block = source.slice(
      source.indexOf("export const MEMBERSHIP_PLAN_OPTIONS"),
      source.indexOf("] as const;", source.indexOf("export const MEMBERSHIP_PLAN_OPTIONS"))
    );
    expect(block).toContain("MembershipPlan.PRO");
    expect(block).toContain("MembershipPlan.ELITE");
    expect(block, "FREE must not be an assignable plan option").not.toContain("MembershipPlan.FREE");
  });

  it("FREE is not a selectable public onboarding plan", async () => {
    const { PUBLIC_ONBOARDING_PLANS, normalizePublicOnboardingPlan } = await import(
      "@/lib/publicOnboarding"
    );
    expect(PUBLIC_ONBOARDING_PLANS as readonly string[]).toEqual(["pro", "elite"]);
    // A legacy ?plan=free bookmark still lands somewhere sensible.
    expect(normalizePublicOnboardingPlan("free")).toBe("pro");
  });

  it("the resolver can never produce FREE as an entitlement", () => {
    // Historical rows still hold FREE; reading one must yield no entitlement.
    expect(normalizeMembershipPlan("FREE")).toBe(NO_MEMBERSHIP);
    expect(normalizeMembershipPlan(null)).toBe(NO_MEMBERSHIP);
    expect(normalizeMembershipPlan("PRO")).toBe("PRO");
  });

  it("no customer-facing membership surface renders 'Free' as a plan", () => {
    const root = process.cwd();
    const surfaces = [
      "app/(app)/firm/membership/page.tsx",
      "app/(app)/vendor/membership/page.tsx",
      "app/(app)/user/membership/page.tsx",
      "app/components/membership/MembershipPageShell.tsx",
      "app/components/membership/MembershipSurfaceGate.tsx",
      "lib/publicOnboarding.ts",
    ];
    // Plan-shaped renderings of Free: a label, an option, or a heading. Not a
    // bare word match — "no payment required" copy and the `free` BILLING MODE
    // are different concepts and must survive.
    const planShapedFree = [
      'label: "Free"',
      '>Free<',
      'value="FREE"',
      '"Free plan"',
      '"Free tier"',
    ];
    for (const relative of surfaces) {
      const text = readFileSync(path.join(root, relative), "utf8");
      for (const phrase of planShapedFree) {
        expect(text, `${relative} should not render ${phrase}`).not.toContain(phrase);
      }
    }
  });

  it("pre-auth membership renders the tier grid instead of bouncing to sign-in", () => {
    const root = process.cwd();
    for (const relative of [
      "app/(app)/firm/membership/page.tsx",
      "app/(app)/vendor/membership/page.tsx",
      "app/(app)/user/membership/page.tsx",
    ]) {
      const text = readFileSync(path.join(root, relative), "utf8");
      // Membership is a sales surface: a signed-out visitor must reach the tiers.
      expect(text, `${relative} should not redirect signed-out visitors`).not.toContain(
        'redirect("/sign-in'
      );
      expect(text, `${relative} should render the shell when signed out`).toContain(
        "MembershipPageShell"
      );
      // …and must not leak account state in that path.
      expect(text).toContain('displayName="Not signed in"');
    }
  });
});
