/**
 * Client-safe core of the /create-account wizard: step order, draft shape,
 * step gates, and per-role question content. No prisma / membership imports —
 * this module is bundled into the client wizard component. Flag gating, plan
 * copy, checkout handoff, and submission validation live in lib/selfSignup.ts
 * (server side).
 *
 * The model accepts an "individual" role for the post-pilot rollout but the
 * wizard never renders it while the individual surfaces stay shelved.
 */

export const SELF_SIGNUP_ROLES = ["vendor", "firm", "individual"] as const;
export type SelfSignupRole = (typeof SELF_SIGNUP_ROLES)[number];

/** Roles the wizard renders during the vendor/firm pilot. */
export const RENDERED_SELF_SIGNUP_ROLES = ["vendor", "firm"] as const satisfies readonly SelfSignupRole[];
export type RenderedSelfSignupRole = (typeof RENDERED_SELF_SIGNUP_ROLES)[number];

export const SELF_SIGNUP_PLANS = ["pro", "elite"] as const;
export type SelfSignupPlan = (typeof SELF_SIGNUP_PLANS)[number];

export const SELF_SIGNUP_STEPS = ["role", "organization", "goal", "plan", "account", "checkout"] as const;
export type SelfSignupStep = (typeof SELF_SIGNUP_STEPS)[number];

export type SelfSignupDraft = {
  role: SelfSignupRole | null;
  orgName: string;
  orgSize: string | null;
  primaryGoal: string | null;
  plan: SelfSignupPlan | null;
  ownerName: string;
  email: string;
  password: string;
};

export function createEmptySelfSignupDraft(): SelfSignupDraft {
  return {
    role: null,
    orgName: "",
    orgSize: null,
    primaryGoal: null,
    plan: null,
    ownerName: "",
    email: "",
    password: "",
  };
}

export function isSelfSignupRole(value: unknown): value is SelfSignupRole {
  return typeof value === "string" && SELF_SIGNUP_ROLES.includes(value as SelfSignupRole);
}

export function isRenderedSelfSignupRole(value: unknown): value is RenderedSelfSignupRole {
  return typeof value === "string" && (RENDERED_SELF_SIGNUP_ROLES as readonly string[]).includes(value);
}

export function isSelfSignupPlan(value: unknown): value is SelfSignupPlan {
  return typeof value === "string" && SELF_SIGNUP_PLANS.includes(value as SelfSignupPlan);
}

export function getSelfSignupStepIndex(step: SelfSignupStep) {
  return SELF_SIGNUP_STEPS.indexOf(step);
}

export const SELF_SIGNUP_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors validatePilotPassword's minimum; the full policy is enforced by the provisioning seam. */
export const SELF_SIGNUP_PASSWORD_MIN_LENGTH = 12;
export const SELF_SIGNUP_PASSWORD_HINT =
  "At least 12 characters with an upper-case letter, a lower-case letter, and a number.";

export type SelfSignupStepCheck = { ok: true } | { ok: false; reason: string };

/**
 * Pure step gate: can the wizard advance past `step` given the draft?
 * The account step intentionally checks shape only — password policy and
 * email uniqueness belong to the provisioning seam on submit.
 */
export function canLeaveSelfSignupStep(step: SelfSignupStep, draft: SelfSignupDraft): SelfSignupStepCheck {
  switch (step) {
    case "role":
      return isRenderedSelfSignupRole(draft.role)
        ? { ok: true }
        : { ok: false, reason: "Choose vendor or firm to continue." };
    case "organization": {
      if (!draft.role) return { ok: false, reason: "Choose vendor or firm to continue." };
      if (!draft.orgName.trim()) {
        return { ok: false, reason: getSelfSignupOrganizationQuestion(draft.role).nameMissingReason };
      }
      if (!draft.orgSize) return { ok: false, reason: "Pick the size that fits best." };
      return { ok: true };
    }
    case "goal":
      return draft.primaryGoal
        ? { ok: true }
        : { ok: false, reason: "Pick the goal that fits best — you can change course later." };
    case "plan":
      return isSelfSignupPlan(draft.plan)
        ? { ok: true }
        : { ok: false, reason: "Choose Pro or Elite to continue." };
    case "account": {
      if (!draft.ownerName.trim()) return { ok: false, reason: "Enter your name." };
      if (!SELF_SIGNUP_EMAIL_PATTERN.test(draft.email.trim().toLowerCase())) {
        return { ok: false, reason: "Enter a valid work email address." };
      }
      if (draft.password.length < SELF_SIGNUP_PASSWORD_MIN_LENGTH) {
        return { ok: false, reason: `Password must be at least ${SELF_SIGNUP_PASSWORD_MIN_LENGTH} characters.` };
      }
      return { ok: true };
    }
    case "checkout":
      return { ok: true };
  }
}

export function getNextSelfSignupStep(step: SelfSignupStep): SelfSignupStep | null {
  const index = getSelfSignupStepIndex(step);
  return SELF_SIGNUP_STEPS[index + 1] ?? null;
}

export function getPreviousSelfSignupStep(step: SelfSignupStep): SelfSignupStep | null {
  const index = getSelfSignupStepIndex(step);
  return index > 0 ? SELF_SIGNUP_STEPS[index - 1] : null;
}

/** First step whose gate fails — used to keep deep-linked / stale state honest. */
export function getFirstIncompleteSelfSignupStep(draft: SelfSignupDraft): SelfSignupStep {
  for (const step of SELF_SIGNUP_STEPS) {
    if (step === "checkout") break;
    if (!canLeaveSelfSignupStep(step, draft).ok) {
      return step;
    }
  }
  return "checkout";
}

/* ---------------------------------------------------------------------------
 * Step content. Onboarding questions follow the Karbon/Canopy/QuickBooks-class
 * signup pattern (researched 2026-06-11 against their live/archived signup
 * forms): org name + size buckets, then a single "primary goal" pick. Two
 * questions per role, one question per screen. Firm size buckets are Financial
 * Cents' verbatim (their ICP analytics key off the same ranges); the QBO-style
 * "Just exploring" escape hatch keeps the goal pick low-friction.
 * ------------------------------------------------------------------------- */

export type SelfSignupRoleOption = {
  role: RenderedSelfSignupRole;
  label: string;
  title: string;
  body: string;
};

export function getSelfSignupRoleOptions(): SelfSignupRoleOption[] {
  return [
    {
      role: "vendor",
      label: "Vendor",
      title: "I build software for accounting firms",
      body: "Map product evidence to the accounting-firm market and see where your product aligns.",
    },
    {
      role: "firm",
      label: "Firm",
      title: "I run or work at an accounting firm",
      body: "Baseline your firm's alignment and evaluate the technology your practice runs on.",
    },
  ];
}

export type SelfSignupOrganizationQuestion = {
  title: string;
  subtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  nameMissingReason: string;
  sizeLabel: string;
  sizeOptions: string[];
};

const ORGANIZATION_QUESTIONS: Record<SelfSignupRole, SelfSignupOrganizationQuestion> = {
  vendor: {
    title: "Tell us about your company",
    subtitle: "PAT uses this to size product evidence against the firms you sell to.",
    nameLabel: "Company name",
    namePlaceholder: "e.g. LedgerWorks Software",
    nameMissingReason: "Enter your company name.",
    sizeLabel: "How big is your team?",
    sizeOptions: ["Just me", "2–10", "11–50", "51–200", "200+"],
  },
  firm: {
    title: "Tell us about your firm",
    subtitle: "PAT uses this to benchmark alignment against firms of a similar size.",
    nameLabel: "Firm name",
    namePlaceholder: "e.g. Garrett & Garrett CPAs",
    nameMissingReason: "Enter your firm name.",
    sizeLabel: "How many people work at your firm, including you?",
    sizeOptions: ["Just me", "2–4", "5–10", "11–20", "21+"],
  },
  individual: {
    title: "Tell us about your work",
    subtitle: "PAT uses this to set up your personal operating profile.",
    nameLabel: "Where do you work?",
    namePlaceholder: "Company or firm name",
    nameMissingReason: "Enter where you work.",
    sizeLabel: "How big is the team you work with?",
    sizeOptions: ["Just me", "2–5", "6–20", "21+"],
  },
};

export function getSelfSignupOrganizationQuestion(role: SelfSignupRole) {
  return ORGANIZATION_QUESTIONS[role];
}

export type SelfSignupGoalQuestion = {
  title: string;
  subtitle: string;
  options: Array<{ value: string; label: string }>;
};

const GOAL_QUESTIONS: Record<SelfSignupRole, SelfSignupGoalQuestion> = {
  vendor: {
    title: "What brings you to PAT?",
    subtitle: "Pick the closest fit — this shapes your first assessment, not your plan.",
    options: [
      { value: "prove-product-market-fit", label: "Prove product–market fit with accounting firms" },
      { value: "benchmark-against-market", label: "Benchmark my product against the market" },
      { value: "firm-facing-evidence", label: "Build evidence for firm-facing sales conversations" },
      { value: "align-roadmap", label: "Align our roadmap with what firms actually need" },
      { value: "exploring", label: "Just exploring" },
    ],
  },
  firm: {
    title: "What brings you to PAT?",
    subtitle: "Pick the closest fit — this shapes your first assessment, not your plan.",
    options: [
      { value: "alignment-baseline", label: "Get an alignment baseline for our practice" },
      { value: "evaluate-vendors", label: "Evaluate vendors and products with real evidence" },
      { value: "close-workflow-gaps", label: "Find and close workflow gaps" },
      { value: "support-tech-decision", label: "Support a technology decision we're planning" },
      { value: "exploring", label: "Just exploring" },
    ],
  },
  individual: {
    title: "What brings you to PAT?",
    subtitle: "Pick the closest fit — this shapes your first assessment, not your plan.",
    options: [
      { value: "personal-baseline", label: "Build my personal alignment baseline" },
      { value: "improve-workflow", label: "Improve how I work day to day" },
    ],
  },
};

export function getSelfSignupGoalQuestion(role: SelfSignupRole) {
  return GOAL_QUESTIONS[role];
}
