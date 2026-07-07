import { describe, expect, it } from "vitest";
import { MEMBERSHIP_PLAN } from "@/lib/membership";
import { getMembershipPageModel, type MembershipTabKey } from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";
import {
  getPublicOnboardingPageModel,
  type PublicOnboardingAudience,
} from "@/lib/publicOnboarding";

/**
 * Contract test (Elite Sprint Block C): FREE is dead in every user-facing
 * membership + onboarding surface. The enum keeps FREE as a rank-0 technical
 * artifact (normalizeMembershipPlan default, admin tooling) but it must never
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
      expect(model.planCards.some((card) => card.key === "free")).toBe(false);
      expect(/^free$/i.test(model.selectedPlanLabel)).toBe(false);

      const offenders = collectStrings({
        planCards: model.planCards,
        selectedPlanLabel: model.selectedPlanLabel,
      }).filter((text) => FREE_COPY.test(text));
      expect(offenders).toEqual([]);
    });
  }
});
