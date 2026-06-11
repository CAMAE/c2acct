import type { MembershipPlan } from "@prisma/client";
import { MEMBERSHIP_PLAN } from "@/lib/membership";
import { buildMembershipCheckoutHref, getMembershipTierSeed } from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";
import {
  SELF_SIGNUP_EMAIL_PATTERN,
  SELF_SIGNUP_PASSWORD_MIN_LENGTH,
  SELF_SIGNUP_PLANS,
  getSelfSignupGoalQuestion,
  getSelfSignupOrganizationQuestion,
  isRenderedSelfSignupRole,
  isSelfSignupPlan,
  type RenderedSelfSignupRole,
  type SelfSignupPlan,
  type SelfSignupRole,
} from "@/lib/selfSignupWizard";

/**
 * Server side of public self-signup (the /create-account wizard), flag-gated
 * for the pilot. PAT_ENABLE_SELF_SIGNUP defaults OFF: demo/pilot accounts stay
 * operator-provisioned and the wizard ships dark until go-live. With the flag
 * off, /create-account redirects to /sign-in and every "Create an account"
 * entry point falls back to the sign-in hub.
 *
 * The client-safe wizard core (steps, gates, question content) lives in
 * lib/selfSignupWizard.ts.
 */

export const SELF_SIGNUP_FLAG_ENV = "PAT_ENABLE_SELF_SIGNUP";

export function isSelfSignupEnabled(env: NodeJS.ProcessEnv = process.env) {
  return env[SELF_SIGNUP_FLAG_ENV] === "1";
}

export const CREATE_ACCOUNT_PATH = "/create-account";

/** Entry-point href: the wizard when self-signup is live, the sign-in hub while it ships dark. */
export function getCreateAccountHref(env: NodeJS.ProcessEnv = process.env) {
  return isSelfSignupEnabled(env) ? CREATE_ACCOUNT_PATH : "/sign-in";
}

export function getSelfSignupMembershipAudience(role: SelfSignupRole): MembershipAudience {
  if (role === "vendor") return "vendor";
  if (role === "firm") return "firm";
  return "individual";
}

function membershipPlanForSelfSignupPlan(plan: SelfSignupPlan): MembershipPlan {
  return plan === "elite" ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
}

export type SelfSignupPlanCard = {
  key: SelfSignupPlan;
  label: string;
  tagline: string;
  features: string[];
  recommended: boolean;
};

/** Pro + Elite only, copy sourced from the membership tier seed (never forked). */
export function getSelfSignupPlanCards(role: SelfSignupRole): SelfSignupPlanCard[] {
  const audience = getSelfSignupMembershipAudience(role);
  return SELF_SIGNUP_PLANS.map((plan) => {
    const seed = getMembershipTierSeed(audience, membershipPlanForSelfSignupPlan(plan));
    return {
      key: plan,
      label: seed.label,
      tagline: seed.tagline,
      features: seed.features,
      recommended: plan === "pro",
    };
  });
}

/**
 * Step 6 handoff: the existing membership checkout. While PAT_BILLING_ENABLED
 * is off the checkout renders its no-live-charge scaffold copy; at billing
 * go-live the same route becomes the real Stripe step with zero wizard work.
 */
export function buildSelfSignupCheckoutHref(role: SelfSignupRole, plan: SelfSignupPlan) {
  const audience = getSelfSignupMembershipAudience(role);
  return `${buildMembershipCheckoutHref(audience, membershipPlanForSelfSignupPlan(plan))}&from=create-account`;
}

export type SelfSignupSubmission = {
  role: RenderedSelfSignupRole;
  orgName: string;
  orgSize: string;
  primaryGoal: string;
  plan: SelfSignupPlan;
  ownerName: string;
  email: string;
  password: string;
};

/**
 * Server-side validation of the wizard's final submission. Shape + option
 * membership only; email uniqueness and the full password policy are enforced
 * by the provisioning seam.
 */
export function validateSelfSignupSubmission(input: {
  role?: unknown;
  orgName?: unknown;
  orgSize?: unknown;
  primaryGoal?: unknown;
  plan?: unknown;
  ownerName?: unknown;
  email?: unknown;
  password?: unknown;
}): { ok: true; submission: SelfSignupSubmission } | { ok: false; message: string } {
  const role = typeof input.role === "string" ? input.role : "";
  if (!isRenderedSelfSignupRole(role)) {
    return { ok: false, message: "Choose vendor or firm to continue." };
  }

  const orgName = typeof input.orgName === "string" ? input.orgName.trim() : "";
  if (!orgName) {
    return { ok: false, message: getSelfSignupOrganizationQuestion(role).nameMissingReason };
  }

  const orgSize = typeof input.orgSize === "string" ? input.orgSize : "";
  if (!getSelfSignupOrganizationQuestion(role).sizeOptions.includes(orgSize)) {
    return { ok: false, message: "Pick the size that fits best." };
  }

  const primaryGoal = typeof input.primaryGoal === "string" ? input.primaryGoal : "";
  if (!getSelfSignupGoalQuestion(role).options.some((option) => option.value === primaryGoal)) {
    return { ok: false, message: "Pick the goal that fits best." };
  }

  const plan = typeof input.plan === "string" ? input.plan : "";
  if (!isSelfSignupPlan(plan)) {
    return { ok: false, message: "Choose Pro or Elite to continue." };
  }

  const ownerName = typeof input.ownerName === "string" ? input.ownerName.trim() : "";
  if (!ownerName) {
    return { ok: false, message: "Enter your name." };
  }

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!SELF_SIGNUP_EMAIL_PATTERN.test(email)) {
    return { ok: false, message: "Enter a valid work email address." };
  }

  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < SELF_SIGNUP_PASSWORD_MIN_LENGTH) {
    return { ok: false, message: `Password must be at least ${SELF_SIGNUP_PASSWORD_MIN_LENGTH} characters.` };
  }

  return {
    ok: true,
    submission: { role, orgName, orgSize, primaryGoal, plan, ownerName, email, password },
  };
}
