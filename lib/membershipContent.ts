import type { MembershipPlan, MembershipStatus } from "@prisma/client";
import { DEFAULT_FREE_MEMBERSHIP_PLAN, MEMBERSHIP_PLAN, normalizeMembershipPlan } from "@/lib/membership";
import type { MembershipAudience } from "@/lib/membershipContext";

export type MembershipTabKey = MembershipPlan | "HELP";

type PlanPanelContent = {
  title: string;
  summary: string;
  what: string;
  why: string;
  ctaTitle: string;
  ctaBody: string;
};

type NarrativePanelContent = {
  title: string;
  summary: string;
  bullets: string[];
};

type MembershipAudienceContent = {
  eyebrow: string;
  title: string;
  body: string;
  plans: Record<MembershipPlan, PlanPanelContent>;
  help: NarrativePanelContent;
};

export type MembershipPageModel = {
  audience: MembershipAudience;
  activeTab: MembershipTabKey;
  currentPlan: MembershipPlan;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
  };
  panel:
    | {
        kind: "plan";
        title: string;
        summary: string;
        what: string;
        why: string;
        ownsPlan: boolean;
        ctaTitle: string;
        ctaBody: string;
        ctaHref: string;
        ctaLabel: string;
      }
    | {
        kind: "narrative";
        title: string;
        summary: string;
        bullets: string[];
  };
};

function isPlanTabKey(value: MembershipTabKey): value is MembershipPlan {
  return value === MEMBERSHIP_PLAN.FREE || value === MEMBERSHIP_PLAN.PRO || value === MEMBERSHIP_PLAN.ELITE;
}

function normalizeMembershipTabKey(
  activeTab: MembershipTabKey | undefined,
  currentPlan: MembershipPlan
): MembershipTabKey {
  if (!activeTab) {
    return getDefaultMembershipTab(currentPlan);
  }

  if (activeTab === "HELP") {
    return activeTab;
  }

  if (isPlanTabKey(activeTab)) {
    return activeTab;
  }

  return getDefaultMembershipTab(currentPlan);
}

const MEMBERSHIP_PAGE_CONTENT: Record<MembershipAudience, MembershipAudienceContent> = {
  vendor: {
    eyebrow: "Vendor membership",
    title: "Choose the PAT operating tier that matches your market motion",
    body:
      "Vendor membership should keep the current tier visible, explain the commercial path calmly, and route straight into provider-backed payment processing when you are ready. If a method or price is not live yet, PAT says so plainly.",
    plans: {
      FREE: {
        title: "Free keeps the vendor PAT baseline visible",
        summary: "Free is the operating floor for keeping your current vendor PAT profile and route access coherent.",
        what:
          "It keeps your vendor portal, profile state, and current PAT orientation in one place without asking buyers to trust a heavier commercial promise yet.",
        why:
          "This helps early-stage or locally reviewed vendors hold a clean baseline before they need deeper alignment packaging.",
        ctaTitle: "Step into Pro when you want stronger buyer-facing positioning",
        ctaBody: "Start provider-backed payment processing when you want the next commercial tier. PAT stores billing context locally and relies on webhooks for final subscription truth.",
      },
      PRO: {
        title: "Pro packages vendor alignment into a stronger commercial surface",
        summary: "Pro is for vendors who need more than a passive profile and want explainable PAT signal available in the live portal.",
        what:
          "It sharpens how operating discipline, workflow friction, receptivity, and implementation posture are presented to the vendor audience.",
        why:
          "That helps a vendor turn assessment signal into usable sales and product-readiness framing instead of leaving insights implicit.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Route into Pro payment processing to create the provider-backed upgrade session. If a selected method is staged, the page will say that plainly instead of faking completion.",
      },
      ELITE: {
        title: "Elite is reserved for the highest-confidence vendor intelligence layer",
        summary: "Elite is the future tier for benchmarked or projection-backed surfaces that PAT should not overstate before they are ready.",
        what:
          "It is the place for more advanced benchmark, scenario, and projection packaging once the supporting evidence and payment rails exist.",
        why:
          "This keeps the vendor promise disciplined: stronger value only appears when the intelligence can be defended.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Use payment processing to start the Elite billing path when configured. PAT still keeps unsupported methods and unfinished intelligence claims visibly staged.",
      },
    },
    help: {
      title: "Help for vendor membership decisions",
      summary: "Use this page to understand the current vendor tier, the next upgrade path, and how the payment-processing handoff works today.",
      bullets: [
        "Free keeps the baseline vendor PAT portal and profile continuity in place when a paid tier is not warranted yet.",
        "Pro is the present-day commercial tier for stronger buyer-facing packaging and clearer explainable signal.",
        "Elite can route into provider-backed billing when configured, but PAT still keeps unsupported payment methods and unfinished intelligence claims visibly staged.",
      ],
    },
  },
  firm: {
    eyebrow: "Firm membership",
    title: "Set the PAT tier that matches how your firm wants to work",
    body:
      "Firm membership should clarify what the current tier enables, what the next tier adds, and where provider-backed payment processing starts without vague upgrade language.",
    plans: {
      FREE: {
        title: "Free keeps the firm PAT core in place",
        summary: "Free gives the firm a stable baseline for structured alignment, profile continuity, and practical PAT orientation.",
        what:
          "It supports the core firm workspace and current PAT foundation without implying a larger intelligence package than the firm is ready to use.",
        why:
          "That helps a firm adopt PAT in a controlled way before it needs broader insight packaging or stronger internal rollout support.",
        ctaTitle: "Move toward Pro when the firm needs stronger operating guidance",
        ctaBody: "Start provider-backed payment processing when the firm is ready for a stronger operating tier. PAT records the billing context locally and reconciles the final truth from provider webhooks.",
      },
      PRO: {
        title: "Pro gives the firm a more actionable operating readout",
        summary: "Pro is for firms that want clearer operating interpretation, stronger insight framing, and a more usable PAT layer for leadership.",
        what:
          "It turns the firm assessment and insight surface into a more practical management tool rather than a completed-assessment trophy.",
        why:
          "That matters when leadership needs to act on readiness, change posture, automation capacity, or governance signal.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Route into Pro payment processing to create the hosted membership handoff. PAT shows staged methods honestly where they are not yet enabled.",
      },
      ELITE: {
        title: "Elite is the disciplined future tier for advanced firm intelligence",
        summary: "Elite is where higher-confidence benchmark or scenario layers can live when the evidence and operating path support them.",
        what:
          "It is intended for premium intelligence surfaces that should remain staged until the underlying signals are genuinely launch-ready.",
        why:
          "That keeps the firm promise honest while still giving operators a visible path to the next commercial tier.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Use payment processing to start the Elite path when configured, without overstating unsupported methods or intelligence scope.",
      },
    },
    help: {
      title: "Help for firm membership decisions",
      summary: "Use this page to compare the current firm tier, understand the next upgrade path, and see what payment processing does versus what is still staged.",
      bullets: [
        "Free keeps the PAT baseline available when the firm needs continuity without a larger commercial commitment.",
        "Pro is the live paid-path tier for stronger leadership-facing packaging and clearer PAT operating guidance.",
        "Elite stays honest. The payment-processing route can be live for configured methods, but it does not imply benchmark-heavy intelligence or unsupported billing methods already exist.",
      ],
    },
  },
  individual: {
    eyebrow: "Individual membership",
    title: "Choose the PAT tier that matches your personal operating depth",
    body:
      "Individual membership should make the next step obvious: understand the current tier, compare the higher tiers honestly, and move directly into provider-backed payment processing if you want more.",
    plans: {
      FREE: {
        title: "Free keeps the individual PAT baseline available",
        summary: "Free is the lightest way to keep a personal PAT subject, profile, and orientation path visible.",
        what:
          "It gives the individual a stable entry point into PAT without claiming a deeper guidance layer than the current use case needs.",
        why:
          "That matters for people who want clarity and continuity first, before they commit to a stronger ongoing intelligence layer.",
        ctaTitle: "Step into Pro when you want stronger guidance",
        ctaBody: "Open provider-backed payment processing to move toward a richer personal PAT tier. PAT keeps unsupported methods visibly staged instead of faking them.",
      },
      PRO: {
        title: "Pro gives the individual a stronger personal PAT layer",
        summary: "Pro is for individuals who want more explicit interpretation and a more meaningful readout from PAT.",
        what:
          "It is the tier where personal signal becomes easier to use for reflection, positioning, and next-step decisions.",
        why:
          "That helps the individual turn PAT from a one-time assessment into a steadier operating aid.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Use payment processing for a direct hosted handoff, with honest labels for any method that is still staged.",
      },
      ELITE: {
        title: "Elite stays reserved for the most advanced personal intelligence layer",
        summary: "Elite is the future tier for premium intelligence packaging that should remain staged until it is honestly supported.",
        what:
          "It is where deeper premium features could live later without forcing them into the current product prematurely.",
        why:
          "That keeps the individual promise grounded while still making the future tier visible.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Route into payment processing to start the Elite path when configured, without implying that unsupported methods or the final premium layer are already complete.",
      },
    },
    help: {
      title: "Help for individual membership decisions",
      summary: "Use this page to compare the current personal tier, understand the next path, and see what the payment-processing route actually does today.",
      bullets: [
        "Choose Free if you want a clean personal PAT baseline with minimal commitment.",
        "Choose Pro if you want a stronger personal guidance layer and clearer use of PAT signal.",
        "Choose Elite only if you are intentionally staging a future premium path rather than expecting billing or the full premium layer to be fully live today.",
      ],
    },
  },
};

export function formatMembershipValue(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function getMembershipPathPrefix(audience: MembershipAudience) {
  return audience === "individual" ? "/user" : `/${audience}`;
}

export function buildMembershipCheckoutHref(audience: MembershipAudience, plan: MembershipPlan) {
  return `${getMembershipPathPrefix(audience)}/membership/payment-processing?plan=${plan.toLowerCase()}`;
}

export function getMembershipTabs() {
  return [
    { key: MEMBERSHIP_PLAN.FREE as MembershipTabKey, label: "Free" },
    { key: MEMBERSHIP_PLAN.PRO as MembershipTabKey, label: "Pro" },
    { key: MEMBERSHIP_PLAN.ELITE as MembershipTabKey, label: "Elite" },
    { key: "HELP" as MembershipTabKey, label: "Help" },
  ];
}

export function getDefaultMembershipTab(plan: MembershipPlan): MembershipTabKey {
  return normalizeMembershipPlan(plan);
}

export function getMembershipStatusSummary(status: MembershipStatus) {
  return formatMembershipValue(status);
}

export function getRequestedCheckoutPlan(rawPlan: string | undefined, currentPlan: MembershipPlan) {
  const normalizedCurrentPlan = normalizeMembershipPlan(currentPlan);
  const normalizedRawPlan = normalizeMembershipPlan(rawPlan);

  if (rawPlan && normalizedRawPlan === rawPlan) {
    return normalizedRawPlan;
  }

  return normalizedCurrentPlan === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
}

export function getMembershipPageModel(input: {
  audience: MembershipAudience;
  currentPlan: MembershipPlan;
  activeTab?: MembershipTabKey;
}): MembershipPageModel {
  const content = MEMBERSHIP_PAGE_CONTENT[input.audience];
  const currentPlan = normalizeMembershipPlan(input.currentPlan);
  const activeTab = normalizeMembershipTabKey(input.activeTab, currentPlan);

  if (activeTab === "HELP") {
    return {
      audience: input.audience,
      activeTab,
      currentPlan,
      hero: {
        eyebrow: content.eyebrow,
        title: content.title,
        body: content.body,
      },
      panel: {
        kind: "narrative",
        title: content.help.title,
        summary: content.help.summary,
        bullets: content.help.bullets,
      },
    };
  }

  const planContent = content.plans[activeTab];
  const ownsPlan = activeTab === currentPlan;
  const ctaPlan = ownsPlan
    ? currentPlan === MEMBERSHIP_PLAN.FREE
      ? MEMBERSHIP_PLAN.PRO
      : currentPlan === MEMBERSHIP_PLAN.PRO
        ? MEMBERSHIP_PLAN.ELITE
        : MEMBERSHIP_PLAN.ELITE
    : activeTab === MEMBERSHIP_PLAN.FREE
      ? currentPlan === DEFAULT_FREE_MEMBERSHIP_PLAN
        ? MEMBERSHIP_PLAN.PRO
        : currentPlan
      : activeTab;
  const ctaLabel = ownsPlan
    ? currentPlan === MEMBERSHIP_PLAN.ELITE
      ? "Open payment-processing status"
      : `Start ${formatMembershipValue(ctaPlan)} payment processing`
    : `Start ${formatMembershipValue(ctaPlan)} payment processing`;
  const ctaBody = ownsPlan
    ? currentPlan === MEMBERSHIP_PLAN.ELITE
      ? "Elite is your current tier. Open the payment-processing route to review pending or billing state without implying that live payment capture is already active."
      : `Your current tier is ${formatMembershipValue(activeTab)}. Use payment processing to stage the next tier cleanly. PAT records the request now and keeps billing capture explicitly staged.`
    : planContent.ctaBody;

  return {
    audience: input.audience,
    activeTab,
    currentPlan,
    hero: {
      eyebrow: content.eyebrow,
      title: content.title,
      body: content.body,
    },
    panel: {
      kind: "plan",
      title: planContent.title,
      summary: planContent.summary,
      what: planContent.what,
      why: planContent.why,
      ownsPlan,
      ctaTitle: ownsPlan ? `Current tier: ${formatMembershipValue(activeTab)}` : planContent.ctaTitle,
      ctaBody,
      ctaHref: buildMembershipCheckoutHref(input.audience, ctaPlan),
      ctaLabel,
    },
  };
}
