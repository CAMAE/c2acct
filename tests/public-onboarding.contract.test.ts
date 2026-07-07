import { describe, expect, it } from "vitest";
import {
  PUBLIC_ONBOARDING_AUDIENCES,
  buildPublicOnboardingState,
  encodePublicOnboardingState,
  getPublicOnboardingHomeCards,
  getPublicOnboardingPageModel,
  normalizePublicOnboardingPlan,
  parsePublicOnboardingCookie,
} from "@/lib/publicOnboarding";

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  };
}

describe("public onboarding contracts", () => {
  it("defines role-specific public paths from homepage to first assessment", () => {
    const homeCards = getPublicOnboardingHomeCards(testEnv());

    expect(homeCards.map((card) => card.audience)).toEqual(["vendor", "firm"]);
    expect(homeCards.map((card) => card.href)).toEqual([
      "/onboarding/vendor",
      "/onboarding/firm",
    ]);

    expect(getPublicOnboardingHomeCards(testEnv({ PAT_ENABLE_INDIVIDUAL_SURFACES: "1" })).map((card) => card.audience)).toEqual([
      "vendor",
      "firm",
      "user",
    ]);

    for (const audience of PUBLIC_ONBOARDING_AUDIENCES) {
      const model = getPublicOnboardingPageModel({ audience });
      expect(model.onboardingHref).toBe(`/onboarding/${audience}`);
      expect(model.firstAssessmentLabel).toMatch(/sign in and start/i);
      expect(model.signInAssessmentHref).toContain("callbackUrl=");
      expect(model.signInAssessmentHref).toContain(encodeURIComponent(model.assessmentHref));
    }
  });

  it("keeps plan choices honest when billing is disabled", () => {
    const model = getPublicOnboardingPageModel({
      audience: "vendor",
      selectedPlan: "pro",
      env: testEnv(),
    });

    expect(model.selectedBilling.mode).toBe("scaffold");
    expect(model.selectedBilling.stateLabel).toBe("Scaffold only");
    expect(model.selectedBilling.truthLabel).toMatch(/No live charge will be created/i);
    // FREE is never rendered as a plan card (Block C purge).
    expect(model.planCards.some((plan) => plan.key === "free")).toBe(false);
    expect(model.planCards.find((plan) => plan.key === "pro")?.checkoutHref).toBe("/vendor/membership/checkout?plan=pro&from=onboarding");
  });

  it("switches paid plan truth to provider-backed only when Stripe configuration and price exist", () => {
    const model = getPublicOnboardingPageModel({
      audience: "user",
      selectedPlan: "pro",
      env: testEnv({
        PAT_BILLING_ENABLED: "1",
        STRIPE_SECRET_KEY: "sk_test_fixture",
        STRIPE_PRICE_USER_PRO: "price_user_pro_fixture",
      }),
    });

    expect(model.selectedBilling.mode).toBe("provider");
    expect(model.selectedBilling.stateLabel).toBe("Stripe configured");
    expect(model.selectedBilling.truthLabel).toMatch(/Stripe-hosted checkout/i);
    expect(model.selectedBilling.truthLabel).toMatch(/does not store raw card numbers/i);
    expect(model.planCards.find((plan) => plan.key === "elite")?.billingMode).toBe("scaffold");
  });

  it("keeps generated insight claims gated behind required evidence", () => {
    for (const audience of PUBLIC_ONBOARDING_AUDIENCES) {
      const model = getPublicOnboardingPageModel({ audience });
      expect(model.emptyStateTitle).toMatch(/stay pending/i);
      expect(model.emptyStateBody).toMatch(/will not/i);
      expect(model.valueBody).toMatch(/until|before/i);
      expect(model.evidenceNeeded.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("persists and validates anonymous onboarding intent through the cookie payload", () => {
    const state = buildPublicOnboardingState({
      audience: "firm",
      plan: "elite",
      step: "first-value",
      now: new Date("2026-04-27T12:00:00.000Z"),
    });
    const encoded = encodePublicOnboardingState(state);

    expect(parsePublicOnboardingCookie(encoded)).toEqual(state);
    expect(parsePublicOnboardingCookie("not-json")).toBeNull();
    expect(normalizePublicOnboardingPlan("unknown")).toBe("pro");
  });
});
