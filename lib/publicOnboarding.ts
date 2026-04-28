import type { MembershipPlan } from "@prisma/client";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { getBillingConfig, getBillingModeForPlan } from "@/lib/billing/config";
import { MEMBERSHIP_PLAN } from "@/lib/membership";
import { buildMembershipCheckoutHref, buildMembershipTierDetailHref } from "@/lib/membershipContent";
import type { MembershipAudience } from "@/lib/membershipContext";

export const PUBLIC_ONBOARDING_COOKIE = "pat-public-onboarding";
export const PUBLIC_ONBOARDING_AUDIENCES = ["vendor", "firm", "user"] as const;
export const PUBLIC_ONBOARDING_PLANS = ["free", "pro", "elite"] as const;

export type PublicOnboardingAudience = (typeof PUBLIC_ONBOARDING_AUDIENCES)[number];
export type PublicOnboardingPlan = (typeof PUBLIC_ONBOARDING_PLANS)[number];
export type PublicOnboardingStep = "role-selected" | "first-value";
export type PublicOnboardingBillingMode = "free" | "provider" | "scaffold";

export type PublicOnboardingState = {
  audience: PublicOnboardingAudience;
  plan: PublicOnboardingPlan;
  step: PublicOnboardingStep;
  updatedAt: string;
};

type AudienceBaseConfig = {
  audience: PublicOnboardingAudience;
  membershipAudience: MembershipAudience;
  signInView: "vendor" | "firm" | "individual";
  label: string;
  shortLabel: string;
  routeHref: string;
  onboardingHref: string;
  assessmentHref: string;
  insightHref: string;
  heroTitle: string;
  heroBody: string;
  valueTitle: string;
  valueBody: string;
  firstAssessmentLabel: string;
  emptyStateTitle: string;
  emptyStateBody: string;
  evidenceNeeded: string[];
};

export type PublicOnboardingPlanCard = {
  key: PublicOnboardingPlan;
  label: string;
  title: string;
  summary: string;
  value: string;
  routeLabel: string;
  actionHref: string;
  actionLabel: string;
  checkoutHref: string | null;
  detailHref: string | null;
  billingMode: PublicOnboardingBillingMode;
  billingLabel: string;
  billingTruth: string;
};

export type PublicOnboardingPageModel = AudienceBaseConfig & {
  selectedPlan: PublicOnboardingPlan;
  selectedPlanLabel: string;
  signInAssessmentHref: string;
  signInWorkspaceHref: string;
  membershipHref: string;
  planCards: PublicOnboardingPlanCard[];
  selectedBilling: {
    mode: PublicOnboardingBillingMode;
    stateLabel: string;
    truthLabel: string;
    disabledReason: string | null;
  };
};

const AUDIENCE_CONFIGS: Record<PublicOnboardingAudience, AudienceBaseConfig> = {
  vendor: {
    audience: "vendor",
    membershipAudience: "vendor",
    signInView: "vendor",
    label: "Vendor",
    shortLabel: "vendor",
    routeHref: "/vendor",
    onboardingHref: "/onboarding/vendor",
    assessmentHref: "/vendor/product-assessment",
    insightHref: "/vendor/product-insight",
    heroTitle: "Vendor onboarding",
    heroBody:
      "Map your product evidence, complete the product assessment, then use PAT to understand where the product fits the accounting-firm market.",
    valueTitle: "First PAT value: product-market fit evidence",
    valueBody:
      "Start with one product assessment so vendor claims, firm needs, and product signals can reconcile before any generated product insight is treated as ready.",
    firstAssessmentLabel: "Sign in and start vendor product assessment",
    emptyStateTitle: "Vendor insights stay pending until product evidence exists.",
    emptyStateBody:
      "PAT will not claim product insights are ready until a product profile and completed vendor product assessment give the model something concrete to evaluate.",
    evidenceNeeded: [
      "Create or select a product profile.",
      "Complete the vendor product assessment.",
      "Review product signals before using insight output.",
    ],
  },
  firm: {
    audience: "firm",
    membershipAudience: "firm",
    signInView: "firm",
    label: "Firm",
    shortLabel: "firm",
    routeHref: "/firm",
    onboardingHref: "/onboarding/firm",
    assessmentHref: "/firm/alignment-assessment",
    insightHref: "/firm/insights",
    heroTitle: "Firm onboarding",
    heroBody:
      "Capture operating priorities, integration needs, and readiness signals so PAT can connect firm alignment to vendor and product decisions.",
    valueTitle: "First PAT value: alignment baseline",
    valueBody:
      "Complete the firm alignment assessment first. PAT keeps insight claims pending until the firm has submitted enough module evidence.",
    firstAssessmentLabel: "Sign in and start firm alignment assessment",
    emptyStateTitle: "Firm insights stay pending until alignment evidence exists.",
    emptyStateBody:
      "PAT will not overstate generated insight before firm modules are complete enough to support a scored, reviewable alignment baseline.",
    evidenceNeeded: [
      "Complete firm alignment modules.",
      "Identify integration and practice-management constraints.",
      "Use completed evidence to unlock firm insight paths.",
    ],
  },
  user: {
    audience: "user",
    membershipAudience: "individual",
    signInView: "individual",
    label: "Individual",
    shortLabel: "individual",
    routeHref: "/user",
    onboardingHref: "/onboarding/user",
    assessmentHref: "/user/alignment-assessment",
    insightHref: "/user/insights",
    heroTitle: "Individual onboarding",
    heroBody:
      "Build a personal operating profile so PAT can translate preferences, maturity, and workflow needs into individual alignment support.",
    valueTitle: "First PAT value: personal operating signal",
    valueBody:
      "Start with the individual alignment assessment. PAT keeps recommendations staged until your answers create enough signal.",
    firstAssessmentLabel: "Sign in and start individual alignment assessment",
    emptyStateTitle: "Individual insights stay pending until personal evidence exists.",
    emptyStateBody:
      "PAT will not claim personalized insight is ready before your alignment assessment creates a reviewable evidence base.",
    evidenceNeeded: [
      "Complete the individual alignment assessment.",
      "Confirm role, workflow, and integration context.",
      "Use the completed profile to review personal insight paths.",
    ],
  },
};

const PLAN_COPY: Record<PublicOnboardingPlan, {
  label: string;
  title: string;
  summary: string;
  value: string;
}> = {
  free: {
    label: "Free",
    title: "Start with assessment evidence",
    summary: "Use the public onboarding path and first assessment route without claiming a paid conversion.",
    value: "Best for validating fit, completing baseline evidence, and seeing what PAT needs before insights are unlocked.",
  },
  pro: {
    label: "Pro",
    title: "Operationalize the first-value path",
    summary: "Connect assessment evidence to the role workspace and paid checkout path when billing is configured.",
    value: "Best for teams that want repeatable assessment, scoring, and first insight review.",
  },
  elite: {
    label: "Elite",
    title: "Stage premium expansion deliberately",
    summary: "Keep advanced services visible without pretending every premium workflow is fully live.",
    value: "Best for high-touch review, deeper operator support, and future premium PAT workflows.",
  },
};

export function isPublicOnboardingAudience(value: unknown): value is PublicOnboardingAudience {
  return typeof value === "string" && PUBLIC_ONBOARDING_AUDIENCES.includes(value as PublicOnboardingAudience);
}

export function isPublicOnboardingPlan(value: unknown): value is PublicOnboardingPlan {
  return typeof value === "string" && PUBLIC_ONBOARDING_PLANS.includes(value as PublicOnboardingPlan);
}

export function normalizePublicOnboardingAudience(value: string | null | undefined) {
  return isPublicOnboardingAudience(value) ? value : null;
}

export function normalizePublicOnboardingPlan(value: string | null | undefined): PublicOnboardingPlan {
  const normalized = value?.trim().toLowerCase();
  return isPublicOnboardingPlan(normalized) ? normalized : "pro";
}

export function getPublicOnboardingConfig(audience: PublicOnboardingAudience) {
  return AUDIENCE_CONFIGS[audience];
}

export function getPublicOnboardingHomeCards() {
  return PUBLIC_ONBOARDING_AUDIENCES.map((audience) => {
    const config = getPublicOnboardingConfig(audience);
    return {
      audience,
      label: config.label,
      title: config.valueTitle,
      body: config.heroBody,
      href: config.onboardingHref,
      assessmentHref: config.assessmentHref,
      ctaLabel: `Start ${config.shortLabel} onboarding`,
    };
  });
}

function membershipPlanForPublicPlan(plan: PublicOnboardingPlan): MembershipPlan | null {
  if (plan === "pro") return MEMBERSHIP_PLAN.PRO;
  if (plan === "elite") return MEMBERSHIP_PLAN.ELITE;
  return null;
}

function getBillingLabels(input: {
  audience: MembershipAudience;
  plan: PublicOnboardingPlan;
  env?: NodeJS.ProcessEnv;
}) {
  const membershipPlan = membershipPlanForPublicPlan(input.plan);
  if (!membershipPlan) {
    return {
      mode: "free" as const,
      stateLabel: "No payment required",
      truthLabel: "The free onboarding path starts with assessment evidence and does not create a checkout session.",
      disabledReason: null,
    };
  }

  const config = getBillingConfig(input.env);
  const billingMode = getBillingModeForPlan({
    config,
    audience: input.audience,
    plan: membershipPlan,
  });

  if (billingMode.mode === "configured") {
    return {
      mode: "provider" as const,
      stateLabel: "Stripe configured",
      truthLabel: "Stripe-hosted checkout is configured for this plan. PAT does not store raw card numbers.",
      disabledReason: null,
    };
  }

  return {
    mode: "scaffold" as const,
    stateLabel: "Scaffold only",
    truthLabel: "No live charge will be created. Billing is staged until Stripe keys and a plan price are configured.",
    disabledReason: billingMode.reason,
  };
}

function buildCheckoutHref(audience: MembershipAudience, plan: PublicOnboardingPlan) {
  const membershipPlan = membershipPlanForPublicPlan(plan);
  if (!membershipPlan) return null;
  return `${buildMembershipCheckoutHref(audience, membershipPlan)}&from=onboarding`;
}

function buildDetailHref(audience: MembershipAudience, plan: PublicOnboardingPlan) {
  const membershipPlan = membershipPlanForPublicPlan(plan);
  if (!membershipPlan) return null;
  return buildMembershipTierDetailHref(audience, membershipPlan);
}

export function getPublicOnboardingPageModel(input: {
  audience: PublicOnboardingAudience;
  selectedPlan?: string | null;
  env?: NodeJS.ProcessEnv;
}): PublicOnboardingPageModel {
  const config = getPublicOnboardingConfig(input.audience);
  const selectedPlan = normalizePublicOnboardingPlan(input.selectedPlan);
  const membershipHref = `${config.routeHref}/membership`;
  const selectedBilling = getBillingLabels({
    audience: config.membershipAudience,
    plan: selectedPlan,
    env: input.env,
  });
  const signInAssessmentHref = buildCanonicalSignInPath({
    callbackUrl: config.assessmentHref,
    view: config.signInView,
  });
  const signInWorkspaceHref = buildCanonicalSignInPath({
    callbackUrl: config.routeHref,
    view: config.signInView,
  });

  return {
    ...config,
    selectedPlan,
    selectedPlanLabel: PLAN_COPY[selectedPlan].label,
    signInAssessmentHref,
    signInWorkspaceHref,
    membershipHref,
    selectedBilling,
    planCards: PUBLIC_ONBOARDING_PLANS.map((plan) => {
      const planCopy = PLAN_COPY[plan];
      const planBilling = getBillingLabels({
        audience: config.membershipAudience,
        plan,
        env: input.env,
      });
      const checkoutHref = buildCheckoutHref(config.membershipAudience, plan);
      return {
        key: plan,
        label: planCopy.label,
        title: planCopy.title,
        summary: planCopy.summary,
        value: planCopy.value,
        routeLabel: plan === selectedPlan ? "Selected path" : "Available path",
        actionHref: checkoutHref ?? signInAssessmentHref,
        actionLabel: checkoutHref ? `Review ${planCopy.label} checkout` : "Start with assessment",
        checkoutHref,
        detailHref: buildDetailHref(config.membershipAudience, plan),
        billingMode: planBilling.mode,
        billingLabel: planBilling.stateLabel,
        billingTruth: planBilling.truthLabel,
      };
    }),
  };
}

export function buildPublicOnboardingState(input: {
  audience: PublicOnboardingAudience;
  plan?: PublicOnboardingPlan | string | null;
  step?: PublicOnboardingStep;
  now?: Date;
}): PublicOnboardingState {
  return {
    audience: input.audience,
    plan: normalizePublicOnboardingPlan(input.plan),
    step: input.step ?? "role-selected",
    updatedAt: (input.now ?? new Date()).toISOString(),
  };
}

export function encodePublicOnboardingState(state: PublicOnboardingState) {
  return encodeURIComponent(JSON.stringify(state));
}

export function parsePublicOnboardingCookie(value: string | null | undefined): PublicOnboardingState | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Partial<PublicOnboardingState>;
    if (!isPublicOnboardingAudience(parsed.audience) || !isPublicOnboardingPlan(parsed.plan)) {
      return null;
    }

    const step = parsed.step === "first-value" ? "first-value" : "role-selected";
    const updatedAt = typeof parsed.updatedAt === "string" && parsed.updatedAt ? parsed.updatedAt : new Date(0).toISOString();
    return {
      audience: parsed.audience,
      plan: parsed.plan,
      step,
      updatedAt,
    };
  } catch {
    return null;
  }
}
