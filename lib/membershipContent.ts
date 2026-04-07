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

type MembershipHelpCard = {
  title: string;
  body: string;
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
        scopeNote: string;
        ownsPlan: boolean;
        ctaTitle: string;
        ctaBody: string;
        ctaHref: string;
        detailHref: string;
        detailLabel: string;
      }
    | {
        kind: "help";
        title: string;
        summary: string;
        cards: MembershipHelpCard[];
      };
};

export type MembershipTierDetailModel = {
  audience: MembershipAudience;
  plan: MembershipPlan;
  currentPlan: MembershipPlan;
  currentStatus: MembershipStatus;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
  };
  routeCard: {
    title: string;
    body: string;
    href: string;
    ctaLabel: string;
  };
  sections: Array<{
    title: string;
    body: string;
  }>;
  ownsPlan: boolean;
  actionLabel: string;
  actionHref: string;
  backHref: string;
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
      title: "PAT membership model",
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
        title: "Pro turns the live firm alignment insight layer into a clearer operating surface",
        summary: "Pro is the current firm membership tier for firms that want the live alignment insight route packaged more explicitly for leadership use.",
        what:
          "It stays tied to the current alignment-insight surface backed by completed modules and capability signal, rather than inventing a wider paid firm platform.",
        why:
          "That matters when leadership needs clearer interpretation of readiness, change posture, automation capacity, and governance signal from the existing PAT evidence.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Open the checkout placeholder to stage the firm alignment-insight tier without over-claiming broader firm product scope.",
      },
      ELITE: {
        title: "Elite is the staged higher-order firm insight tier",
        summary: "Elite remains the visible but still staged extension of the firm alignment insight surface.",
        what:
          "It is reserved for richer firm insight packaging that should stay attached to alignment evidence until PAT can support a stronger premium layer honestly.",
        why:
          "That keeps the firm promise honest while still making the higher-order tier legible.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Use the checkout placeholder to register Elite intent without implying a broader firm intelligence suite is already live.",
      },
    },
    meetPat: {
      title: "PAT membership model",
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
      title: "PAT membership model",
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

export function buildMembershipTierDetailHref(audience: MembershipAudience, plan: MembershipPlan) {
  return `${getMembershipPathPrefix(audience)}/membership/${plan.toLowerCase()}`;
}

export function getRequestedMembershipTab(
  rawTab: string | undefined,
  currentPlan: MembershipPlan
): MembershipTabKey {
  const normalizedTab = rawTab?.trim().toUpperCase();

  if (normalizedTab === "HELP") {
    return "HELP";
  }

  if (
    normalizedTab === MEMBERSHIP_PLAN.FREE ||
    normalizedTab === MEMBERSHIP_PLAN.PRO ||
    normalizedTab === MEMBERSHIP_PLAN.ELITE
  ) {
    return normalizedTab;
  }

  return getDefaultMembershipTab(currentPlan);
}

export function parseMembershipPlanSegment(rawSegment: string | undefined) {
  const normalizedSegment = rawSegment?.trim().toUpperCase();

  if (
    normalizedSegment === MEMBERSHIP_PLAN.FREE ||
    normalizedSegment === MEMBERSHIP_PLAN.PRO ||
    normalizedSegment === MEMBERSHIP_PLAN.ELITE
  ) {
    return normalizedSegment;
  }

  return null;
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

function getMembershipScopeNote(audience: MembershipAudience, plan: MembershipPlan) {
  if (audience === "vendor") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "Free keeps the vendor workspace, profile continuity, and membership/account state coherent. It does not claim the stronger vendor insight packaging reserved for higher tiers.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "Pro is the live vendor-facing packaging layer around current product intelligence and alignment insight routes. It stays grounded in current PAT signal rather than benchmark or projection claims.";
    }

    return "Elite is visible as the higher vendor intelligence tier, but its benchmark, scenario, and richer premium packaging remain staged rather than fully unlocked today.";
  }

  if (audience === "firm") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "Free keeps the firm workspace, alignment route access, and membership state coherent without claiming a broader paid intelligence layer.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "Current firm Pro scope aligns to the live firm alignment insight surface. It is not a separate paid contract for product review, admin, or advisory behavior.";
    }

    return "Current firm Elite remains a staged higher-order firm insight layer attached to the alignment insight surface. It does not unlock a broader firm product suite today.";
  }

  if (plan === MEMBERSHIP_PLAN.FREE) {
    return "Free keeps the individual workspace, profile continuity, and personal PAT subject path available without claiming a deeper guidance layer.";
  }

  if (plan === MEMBERSHIP_PLAN.PRO) {
    return "Current individual Pro scope is the live but intentionally light personal insight surface PAT can support from person-level alignment state now.";
  }

  return "Individual Elite stays staged and explanation-first. It does not imply a full personal benchmark, projection, or coaching engine is already live.";
}

function getMembershipLiveNowNote(audience: MembershipAudience, plan: MembershipPlan) {
  if (audience === "vendor") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "The baseline vendor workspace, profile state, and membership plumbing are already live and route-backed.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "The live vendor Pro framing appears today across vendor product intelligence and vendor alignment insight surfaces.";
    }

    return "The Elite vendor layer is currently represented through locked cards and detail routes that stay visible without overstating the premium layer.";
  }

  if (audience === "firm") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "The live firm baseline is the workspace, alignment assessment, and membership/account state already present in PAT.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "The live firm Pro layer is the firm insights surface backed by alignment-module and capability signal.";
    }

    return "The live firm Elite expression is still the locked higher-order layer inside the firm insights surface.";
  }

  if (plan === MEMBERSHIP_PLAN.FREE) {
    return "The individual baseline is the workspace, profile continuity, and subject-aware membership plumbing already present in PAT.";
  }

  if (plan === MEMBERSHIP_PLAN.PRO) {
    return "The live individual Pro layer is the limited but real person-level insight structure that opens from the individual alignment path.";
  }

  return "The live individual Elite expression remains a staged locked layer with disciplined detail pages instead of fabricated premium analysis.";
}

function getMembershipStagedNote(audience: MembershipAudience, plan: MembershipPlan) {
  if (audience === "vendor") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "Moving beyond Free is about stronger vendor-facing insight packaging, not about replacing the baseline PAT evidence contract.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "What stays out of scope in Pro is the richer benchmark, scenario, and projection packaging reserved for a later Elite layer.";
    }

    return "Elite remains staged until the premium vendor intelligence layer can be defended with the right evidence and commercial plumbing.";
  }

  if (audience === "firm") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "Higher tiers are about clearer firm insight packaging, not about inventing a larger paid firm platform before the current scope is ready.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "What stays out of scope in firm Pro today is any broader paid promise beyond the live alignment-insight layer.";
    }

    return "Elite stays staged until PAT can back a stronger firm intelligence layer without overclaiming the current source truth.";
  }

  if (plan === MEMBERSHIP_PLAN.FREE) {
    return "Higher tiers are about stronger personal interpretation and packaging, not about changing the honesty of the underlying person-level signal.";
  }

  if (plan === MEMBERSHIP_PLAN.PRO) {
    return "What stays out of scope in individual Pro is the richer premium intelligence layer that PAT has not built yet.";
  }

  return "Elite remains staged until PAT has a real premium personal layer instead of a thin placeholder.";
}

function getMembershipRouteCard(audience: MembershipAudience, plan: MembershipPlan) {
  if (audience === "vendor") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return {
        title: "Current vendor workspace",
        body: "Review the live vendor workspace, assessment, and help surfaces from the baseline tier.",
        href: "/vendor",
        ctaLabel: "Open vendor workspace",
      };
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return {
        title: "Live vendor intelligence routes",
        body: "Open the current vendor product and alignment insight surfaces that carry the live Pro framing today.",
        href: "/vendor/product-insight",
        ctaLabel: "Open vendor product intelligence",
      };
    }

    return {
      title: "Visible but staged vendor layer",
      body: "Review the locked vendor intelligence surfaces where Elite remains visible but not overstated.",
      href: "/vendor/alignment-insights",
      ctaLabel: "Open vendor alignment insights",
    };
  }

  if (audience === "firm") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return {
        title: "Current firm workspace",
        body: "Open the live firm workspace and alignment assessment baseline.",
        href: "/firm",
        ctaLabel: "Open firm workspace",
      };
    }

    return {
      title: plan === MEMBERSHIP_PLAN.PRO ? "Live firm alignment insights" : "Staged firm intelligence layer",
      body:
        plan === MEMBERSHIP_PLAN.PRO
          ? "Open the current firm insight surface backed by completed alignment modules and capability signal."
          : "Open the firm insight surface where the higher-order Elite layer is visible but still locked and disclaimer-driven.",
      href: "/firm/insights",
      ctaLabel: "Open firm insights",
    };
  }

  if (plan === MEMBERSHIP_PLAN.FREE) {
    return {
      title: "Current individual workspace",
      body: "Open the live individual workspace, profile path, and alignment entry points from the baseline tier.",
      href: "/user",
      ctaLabel: "Open individual workspace",
    };
  }

  return {
    title: plan === MEMBERSHIP_PLAN.PRO ? "Live individual insight route" : "Staged individual premium layer",
    body:
      plan === MEMBERSHIP_PLAN.PRO
        ? "Open the current person-level insight surface that PAT can support from live alignment state."
        : "Open the individual insight surface where Elite remains visible but intentionally limited.",
    href: "/user/insights",
    ctaLabel: "Open individual insights",
  };
}

function getMembershipHelpCards(
  audience: MembershipAudience,
  content: MembershipAudienceContent
): MembershipHelpCard[] {
  return [
    {
      title: "Free",
      body: `${content.plans.FREE.summary} ${getMembershipScopeNote(audience, MEMBERSHIP_PLAN.FREE)}`,
    },
    {
      title: "Pro",
      body: `${content.plans.PRO.summary} ${getMembershipScopeNote(audience, MEMBERSHIP_PLAN.PRO)}`,
    },
    {
      title: "Elite",
      body: `${content.plans.ELITE.summary} ${getMembershipScopeNote(audience, MEMBERSHIP_PLAN.ELITE)}`,
    },
    {
      title: "PAT membership model",
      body: `${content.meetPat.summary} ${content.meetPat.bullets[0] ?? ""}`.trim(),
    },
  ];
}

export function getMembershipTierDetailModel(input: {
  audience: MembershipAudience;
  plan: MembershipPlan;
  currentPlan: MembershipPlan;
  currentStatus: MembershipStatus;
}): MembershipTierDetailModel {
  const content = MEMBERSHIP_PAGE_CONTENT[input.audience];
  const selectedPlan = normalizeMembershipPlan(input.plan);
  const currentPlan = normalizeMembershipPlan(input.currentPlan);
  const ownsPlan = selectedPlan === currentPlan;
  const checkoutPlan =
    selectedPlan === MEMBERSHIP_PLAN.FREE
      ? currentPlan === DEFAULT_FREE_MEMBERSHIP_PLAN
        ? MEMBERSHIP_PLAN.PRO
        : currentPlan
      : selectedPlan;
  const planContent = content.plans[selectedPlan];
  const routeCard = getMembershipRouteCard(input.audience, selectedPlan);

  return {
    audience: input.audience,
    plan: selectedPlan,
    currentPlan,
    currentStatus: input.currentStatus,
    hero: {
      eyebrow: `${content.eyebrow} · ${formatMembershipValue(selectedPlan)}`,
      title: planContent.title,
      body: `${planContent.summary} ${getMembershipScopeNote(input.audience, selectedPlan)}`,
    },
    routeCard,
    sections: [
      {
        title: "What it is",
        body: planContent.what,
      },
      {
        title: "Current truthful scope",
        body: getMembershipLiveNowNote(input.audience, selectedPlan),
      },
      {
        title: "What stays staged",
        body: getMembershipStagedNote(input.audience, selectedPlan),
      },
    ],
    ownsPlan,
    actionLabel:
      ownsPlan && selectedPlan === MEMBERSHIP_PLAN.FREE
        ? "Explore Pro checkout placeholder"
        : ownsPlan
          ? "Open current tier checkout placeholder"
          : `Open ${formatMembershipValue(checkoutPlan)} checkout placeholder`,
    actionHref: buildMembershipCheckoutHref(input.audience, checkoutPlan),
    backHref: `${getMembershipPathPrefix(input.audience)}/membership?tab=${selectedPlan.toLowerCase()}`,
  };
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
        kind: "help",
        title: content.help.title,
        summary: content.help.summary,
        cards: getMembershipHelpCards(input.audience, content),
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
      scopeNote: getMembershipScopeNote(input.audience, activeTab),
      ownsPlan,
      ctaTitle: ownsPlan ? `Continue with ${formatMembershipValue(activeTab)}` : planContent.ctaTitle,
      ctaBody: ownsPlan
        ? `Open the ${formatMembershipValue(ctaPlan)} checkout placeholder to continue the current membership handoff cleanly.`
        : planContent.ctaBody,
      ctaHref: buildMembershipCheckoutHref(input.audience, ctaPlan),
      detailHref: buildMembershipTierDetailHref(input.audience, activeTab),
      detailLabel: `Open ${formatMembershipValue(activeTab)} detail`,
    },
  };
}
