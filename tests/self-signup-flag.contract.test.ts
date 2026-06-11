import { describe, expect, it } from "vitest";
import { MEMBERSHIP_PLAN } from "@/lib/membership";
import { getMembershipTierSeed } from "@/lib/membershipContent";
import {
  CREATE_ACCOUNT_PATH,
  SELF_SIGNUP_FLAG_ENV,
  buildSelfSignupCheckoutHref,
  getCreateAccountHref,
  getSelfSignupPlanCards,
  isSelfSignupEnabled,
  validateSelfSignupSubmission,
} from "@/lib/selfSignup";
import { getSelfSignupGoalQuestion, getSelfSignupOrganizationQuestion } from "@/lib/selfSignupWizard";

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  };
}

function validSubmissionInput() {
  return {
    role: "vendor",
    orgName: "LedgerWorks Software",
    orgSize: getSelfSignupOrganizationQuestion("vendor").sizeOptions[1],
    primaryGoal: getSelfSignupGoalQuestion("vendor").options[0].value,
    plan: "pro",
    ownerName: "Casey Owner",
    email: "Casey@LedgerWorks.example",
    password: "ValidPassword12",
  };
}

describe("self-signup flag gating contract", () => {
  it("defaults OFF: self-signup ships dark unless PAT_ENABLE_SELF_SIGNUP=1", () => {
    expect(isSelfSignupEnabled(testEnv())).toBe(false);
    expect(isSelfSignupEnabled(testEnv({ [SELF_SIGNUP_FLAG_ENV]: "0" }))).toBe(false);
    expect(isSelfSignupEnabled(testEnv({ [SELF_SIGNUP_FLAG_ENV]: "true" }))).toBe(false);
    expect(isSelfSignupEnabled(testEnv({ [SELF_SIGNUP_FLAG_ENV]: "1" }))).toBe(true);
  });

  it("falls back every create-account entry point to the sign-in hub while dark", () => {
    expect(getCreateAccountHref(testEnv())).toBe("/sign-in");
    expect(getCreateAccountHref(testEnv({ [SELF_SIGNUP_FLAG_ENV]: "1" }))).toBe(CREATE_ACCOUNT_PATH);
  });

  it("offers Pro and Elite only, with copy sourced from the membership tier seed", () => {
    for (const role of ["vendor", "firm"] as const) {
      const cards = getSelfSignupPlanCards(role);
      expect(cards.map((card) => card.key)).toEqual(["pro", "elite"]);

      const proSeed = getMembershipTierSeed(role, MEMBERSHIP_PLAN.PRO);
      const eliteSeed = getMembershipTierSeed(role, MEMBERSHIP_PLAN.ELITE);
      expect(cards[0].tagline).toBe(proSeed.tagline);
      expect(cards[0].features).toEqual(proSeed.features);
      expect(cards[1].tagline).toBe(eliteSeed.tagline);
      expect(cards[1].features).toEqual(eliteSeed.features);
    }
  });

  it("hands off to the existing membership checkout route", () => {
    expect(buildSelfSignupCheckoutHref("vendor", "pro")).toBe(
      "/vendor/membership/checkout?plan=pro&from=create-account"
    );
    expect(buildSelfSignupCheckoutHref("firm", "elite")).toBe(
      "/firm/membership/checkout?plan=elite&from=create-account"
    );
  });

  it("validates the final submission shape and option membership", () => {
    const valid = validateSelfSignupSubmission(validSubmissionInput());
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.submission.email).toBe("casey@ledgerworks.example");
      expect(valid.submission.role).toBe("vendor");
    }

    // The model accepts "individual" later, but submission rejects it during the pilot.
    expect(validateSelfSignupSubmission({ ...validSubmissionInput(), role: "individual" }).ok).toBe(false);
    expect(validateSelfSignupSubmission({ ...validSubmissionInput(), orgSize: "a million" }).ok).toBe(false);
    expect(validateSelfSignupSubmission({ ...validSubmissionInput(), primaryGoal: "world-domination" }).ok).toBe(false);
    expect(validateSelfSignupSubmission({ ...validSubmissionInput(), plan: "free" }).ok).toBe(false);
    expect(validateSelfSignupSubmission({ ...validSubmissionInput(), password: "short" }).ok).toBe(false);
    expect(validateSelfSignupSubmission({ ...validSubmissionInput(), email: "nope" }).ok).toBe(false);
  });
});
