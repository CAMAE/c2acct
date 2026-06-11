import { describe, expect, it } from "vitest";
import {
  RENDERED_SELF_SIGNUP_ROLES,
  SELF_SIGNUP_PLANS,
  SELF_SIGNUP_STEPS,
  canLeaveSelfSignupStep,
  createEmptySelfSignupDraft,
  getFirstIncompleteSelfSignupStep,
  getNextSelfSignupStep,
  getPreviousSelfSignupStep,
  getSelfSignupGoalQuestion,
  getSelfSignupOrganizationQuestion,
  getSelfSignupRoleOptions,
  isRenderedSelfSignupRole,
  isSelfSignupRole,
  type SelfSignupDraft,
} from "@/lib/selfSignupWizard";

function completeDraft(): SelfSignupDraft {
  return {
    role: "vendor",
    orgName: "LedgerWorks Software",
    orgSize: getSelfSignupOrganizationQuestion("vendor").sizeOptions[0],
    primaryGoal: getSelfSignupGoalQuestion("vendor").options[0].value,
    plan: "pro",
    ownerName: "Casey Owner",
    email: "casey@ledgerworks.example",
    password: "ValidPassword12",
  };
}

describe("self-signup wizard state machine", () => {
  it("orders the six steps with checkout as the handoff", () => {
    expect(SELF_SIGNUP_STEPS).toEqual(["role", "organization", "goal", "plan", "account", "checkout"]);
    expect(getNextSelfSignupStep("role")).toBe("organization");
    expect(getNextSelfSignupStep("account")).toBe("checkout");
    expect(getNextSelfSignupStep("checkout")).toBeNull();
    expect(getPreviousSelfSignupStep("role")).toBeNull();
    expect(getPreviousSelfSignupStep("organization")).toBe("role");
  });

  it("accepts the individual role in the model but never renders it", () => {
    expect(isSelfSignupRole("individual")).toBe(true);
    expect(isRenderedSelfSignupRole("individual")).toBe(false);
    expect(RENDERED_SELF_SIGNUP_ROLES).toEqual(["vendor", "firm"]);
    expect(getSelfSignupRoleOptions().map((option) => option.role)).toEqual(["vendor", "firm"]);
    // An individual draft cannot pass the role gate while the pilot renders vendor/firm only.
    const draft = { ...completeDraft(), role: "individual" as const };
    expect(canLeaveSelfSignupStep("role", draft).ok).toBe(false);
  });

  it("gates every step on its own answer", () => {
    const empty = createEmptySelfSignupDraft();
    expect(canLeaveSelfSignupStep("role", empty).ok).toBe(false);
    expect(canLeaveSelfSignupStep("organization", { ...empty, role: "firm" }).ok).toBe(false);
    expect(
      canLeaveSelfSignupStep("organization", {
        ...empty,
        role: "firm",
        orgName: "Garrett & Garrett",
        orgSize: "2–4",
      }).ok
    ).toBe(true);
    expect(canLeaveSelfSignupStep("goal", empty).ok).toBe(false);
    expect(canLeaveSelfSignupStep("plan", empty).ok).toBe(false);
    expect(canLeaveSelfSignupStep("plan", { ...empty, plan: "elite" }).ok).toBe(true);

    const complete = completeDraft();
    for (const step of SELF_SIGNUP_STEPS) {
      expect(canLeaveSelfSignupStep(step, complete).ok).toBe(true);
    }
  });

  it("rejects account details that cannot provision", () => {
    const complete = completeDraft();
    expect(canLeaveSelfSignupStep("account", { ...complete, ownerName: " " }).ok).toBe(false);
    expect(canLeaveSelfSignupStep("account", { ...complete, email: "not-an-email" }).ok).toBe(false);
    expect(canLeaveSelfSignupStep("account", { ...complete, password: "short" }).ok).toBe(false);
  });

  it("finds the first incomplete step for stale or deep-linked state", () => {
    expect(getFirstIncompleteSelfSignupStep(createEmptySelfSignupDraft())).toBe("role");
    expect(getFirstIncompleteSelfSignupStep({ ...completeDraft(), plan: null })).toBe("plan");
    expect(getFirstIncompleteSelfSignupStep(completeDraft())).toBe("checkout");
  });

  it("ships exactly two onboarding questions per rendered role", () => {
    for (const role of RENDERED_SELF_SIGNUP_ROLES) {
      const organization = getSelfSignupOrganizationQuestion(role);
      expect(organization.title.length).toBeGreaterThan(0);
      expect(organization.sizeOptions.length).toBeGreaterThanOrEqual(4);
      const goal = getSelfSignupGoalQuestion(role);
      expect(goal.options.length).toBeGreaterThanOrEqual(4);
      const values = goal.options.map((option) => option.value);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("renders Pro and Elite as the only plan choices", () => {
    expect(SELF_SIGNUP_PLANS).toEqual(["pro", "elite"]);
  });
});
