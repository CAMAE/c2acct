import type { MembershipPlan, MembershipStatus } from "@prisma/client";
import { DEFAULT_FREE_MEMBERSHIP_PLAN, MEMBERSHIP_PLAN, normalizeMembershipPlan } from "@/lib/membership";
import type { MembershipAudience } from "@/lib/membershipContext";

export type MembershipTabKey = MembershipPlan | "MEET_PAT" | "HELP";

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
  meetPat: NarrativePanelContent;
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

  if (activeTab === "MEET_PAT" || activeTab === "HELP") {
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
      "Vendor membership should stay simple: keep the current tier visible, explain the next tier clearly, and move straight into a clean checkout placeholder when you are ready.",
    plans: {
      FREE: {
        title: "Free keeps the vendor PAT baseline visible",
        summary: "Free is the operating floor for keeping your current vendor PAT profile and route access coherent.",
        what:
          "It keeps your vendor portal, profile state, and current PAT orientation in one place without asking buyers to trust a heavier commercial promise yet.",
        why:
          "This helps early-stage or locally reviewed vendors hold a clean baseline before they need deeper alignment packaging.",
        ctaTitle: "Step into Pro when you want stronger buyer-facing positioning",
        ctaBody: "Move into the Pro placeholder flow to stage richer alignment readouts and a clearer commercial handoff.",
      },
      PRO: {
        title: "Pro packages vendor alignment into a stronger commercial surface",
        summary: "Pro is for vendors who need more than a passive profile and want explainable PAT signal available in the live portal.",
        what:
          "It sharpens how operating discipline, workflow friction, receptivity, and implementation posture are presented to the vendor audience.",
        why:
          "That helps a vendor turn assessment signal into usable sales and product-readiness framing instead of leaving insights implicit.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Open the checkout placeholder to stage Pro membership and the associated commercial handoff cleanly.",
      },
      ELITE: {
        title: "Elite is reserved for the highest-confidence vendor intelligence layer",
        summary: "Elite is the future tier for benchmarked or projection-backed surfaces that PAT should not overstate before they are ready.",
        what:
          "It is the place for more advanced benchmark, scenario, and projection packaging once the supporting evidence and payment rails exist.",
        why:
          "This keeps the vendor promise disciplined: stronger value only appears when the intelligence can be defended.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Use the checkout placeholder to mark Elite interest without pretending the final commercial layer is already live.",
      },
    },
    meetPat: {
      title: "Meet PAT inside the membership flow",
      summary: "PAT membership should feel connected to the operating model, not bolted on beside it.",
      bullets: [
        "PAT turns structured assessment signal into explainable operating readouts for the vendor audience.",
        "Membership simply controls how much of that readout is packaged, visible, and commercially usable.",
        "The tier model stays restrained so the product promise does not outrun the current evidence.",
      ],
    },
    help: {
      title: "Help for vendor membership decisions",
      summary: "Use this page to decide whether the current vendor state is enough or whether a stronger tier is warranted.",
      bullets: [
        "Choose Free if you only need the baseline PAT portal and profile continuity.",
        "Choose Pro if you need a stronger vendor-facing alignment story with clearer commercial packaging.",
        "Choose Elite only when you are intentionally staging advanced intelligence that is not yet fully live.",
      ],
    },
  },
  firm: {
    eyebrow: "Firm membership",
    title: "Set the PAT tier that matches how your firm wants to work",
    body:
      "Firm membership should clarify what the current tier enables, what the next tier adds, and where the checkout handoff begins without burying the decision in vague upgrade copy.",
    plans: {
      FREE: {
        title: "Free keeps the firm PAT core in place",
        summary: "Free gives the firm a stable baseline for structured alignment, profile continuity, and practical PAT orientation.",
        what:
          "It supports the core firm workspace and current PAT foundation without implying a larger intelligence package than the firm is ready to use.",
        why:
          "That helps a firm adopt PAT in a controlled way before it needs broader insight packaging or stronger internal rollout support.",
        ctaTitle: "Move toward Pro when the firm needs stronger operating guidance",
        ctaBody: "Start the checkout placeholder to stage a firmer PAT operating tier without adding payment complexity yet.",
      },
      PRO: {
        title: "Pro gives the firm a more actionable operating readout",
        summary: "Pro is for firms that want clearer operating interpretation, stronger insight framing, and a more usable PAT layer for leadership.",
        what:
          "It turns the firm assessment and insight surface into a more practical management tool rather than a completed-assessment trophy.",
        why:
          "That matters when leadership needs to act on readiness, change posture, automation capacity, or governance signal.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Open the checkout placeholder and carry the firm toward a stronger PAT operating tier.",
      },
      ELITE: {
        title: "Elite is the disciplined future tier for advanced firm intelligence",
        summary: "Elite is where higher-confidence benchmark or scenario layers can live when the evidence and operating path support them.",
        what:
          "It is intended for premium intelligence surfaces that should remain staged until the underlying signals are genuinely launch-ready.",
        why:
          "That keeps the firm promise honest while still giving operators a visible path to the next commercial tier.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Use the checkout placeholder to register Elite intent without overstating today’s live product.",
      },
    },
    meetPat: {
      title: "Meet PAT inside the firm membership flow",
      summary: "Membership should reinforce PAT’s operating role inside the firm rather than distract from it.",
      bullets: [
        "PAT uses structured assessments and capability state to ground the firm intelligence layer.",
        "Membership determines how that layer is packaged for ongoing use, not whether the evidence is real.",
        "The firm path stays conservative so membership language does not outrun the current signal quality.",
      ],
    },
    help: {
      title: "Help for firm membership decisions",
      summary: "Choose the tier that matches how much PAT operating value the firm is ready to use right now.",
      bullets: [
        "Choose Free for a clean baseline with minimal commercial commitment.",
        "Choose Pro when leadership needs a stronger PAT operating layer and better insight packaging.",
        "Choose Elite only when you are deliberately preparing for a more advanced intelligence tier.",
      ],
    },
  },
  individual: {
    eyebrow: "Individual membership",
    title: "Choose the PAT tier that matches your personal operating depth",
    body:
      "Individual membership should make the next step obvious: understand the current tier, compare the higher tiers honestly, and move directly into a clean placeholder checkout if you want more.",
    plans: {
      FREE: {
        title: "Free keeps the individual PAT baseline available",
        summary: "Free is the lightest way to keep a personal PAT subject, profile, and orientation path visible.",
        what:
          "It gives the individual a stable entry point into PAT without claiming a deeper guidance layer than the current use case needs.",
        why:
          "That matters for people who want clarity and continuity first, before they commit to a stronger ongoing intelligence layer.",
        ctaTitle: "Step into Pro when you want stronger guidance",
        ctaBody: "Open the checkout placeholder to move toward a richer personal PAT tier without adding real payment logic yet.",
      },
      PRO: {
        title: "Pro gives the individual a stronger personal PAT layer",
        summary: "Pro is for individuals who want more explicit interpretation and a more meaningful readout from PAT.",
        what:
          "It is the tier where personal signal becomes easier to use for reflection, positioning, and next-step decisions.",
        why:
          "That helps the individual turn PAT from a one-time assessment into a steadier operating aid.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Use the checkout placeholder to stage a stronger personal tier with a direct, non-ambiguous handoff.",
      },
      ELITE: {
        title: "Elite stays reserved for the most advanced personal intelligence layer",
        summary: "Elite is the future tier for premium intelligence packaging that should remain staged until it is honestly supported.",
        what:
          "It is where deeper premium features could live later without forcing them into the current product prematurely.",
        why:
          "That keeps the individual promise grounded while still making the future tier visible.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Route into the checkout placeholder to register Elite intent without implying that the final premium layer is already complete.",
      },
    },
    meetPat: {
      title: "Meet PAT inside the individual membership flow",
      summary: "PAT membership for individuals should stay practical, legible, and restrained.",
      bullets: [
        "PAT turns structured personal assessment signal into a usable operating readout.",
        "Membership changes the level of packaging and support around that readout, not the underlying honesty of the data.",
        "The tier language stays conservative so individual users are not sold a fantasy intelligence layer.",
      ],
    },
    help: {
      title: "Help for individual membership decisions",
      summary: "Use this page to compare what the current personal tier gives you and what the next tier is meant to add.",
      bullets: [
        "Choose Free if you want a clean personal PAT baseline with minimal commitment.",
        "Choose Pro if you want a stronger personal guidance layer and clearer use of PAT signal.",
        "Choose Elite only if you are intentionally staging a future premium path rather than expecting it to be fully live today.",
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
  return `${getMembershipPathPrefix(audience)}/membership/checkout?plan=${plan.toLowerCase()}`;
}

export function getMembershipTabs() {
  return [
    { key: MEMBERSHIP_PLAN.FREE as MembershipTabKey, label: "Free" },
    { key: MEMBERSHIP_PLAN.PRO as MembershipTabKey, label: "Pro" },
    { key: MEMBERSHIP_PLAN.ELITE as MembershipTabKey, label: "Elite" },
    { key: "MEET_PAT" as MembershipTabKey, label: "Meet PAT" },
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

  if (activeTab === "MEET_PAT") {
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
        title: content.meetPat.title,
        summary: content.meetPat.summary,
        bullets: content.meetPat.bullets,
      },
    };
  }

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
  const ctaPlan =
    activeTab === MEMBERSHIP_PLAN.FREE
      ? currentPlan === DEFAULT_FREE_MEMBERSHIP_PLAN
        ? MEMBERSHIP_PLAN.PRO
        : currentPlan
      : activeTab;

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
      ctaTitle: ownsPlan ? `Continue with ${formatMembershipValue(activeTab)}` : planContent.ctaTitle,
      ctaBody: ownsPlan
        ? `Open the ${formatMembershipValue(ctaPlan)} checkout placeholder to continue the current membership handoff cleanly.`
        : planContent.ctaBody,
      ctaHref: buildMembershipCheckoutHref(input.audience, ctaPlan),
    },
  };
}
