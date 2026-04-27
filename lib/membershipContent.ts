import type { MembershipPlan, MembershipStatus } from "@prisma/client";
import { DEFAULT_FREE_MEMBERSHIP_PLAN, MEMBERSHIP_PLAN, normalizeMembershipPlan } from "@/lib/membership";
import type { MembershipAudience } from "@/lib/membershipContext";

export type MembershipTabKey = typeof MEMBERSHIP_PLAN.PRO | typeof MEMBERSHIP_PLAN.ELITE | "HELP";
export type MembershipPaymentMethodKey = "card" | "bank" | "paypal" | "stripe" | "square";
export type MembershipCheckoutBillingMode = "provider" | "scaffold";

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
      liveNowNote: string;
      stagedNote: string;
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
  sections: Array<{
    title: string;
    body: string;
  }>;
  ownsPlan: boolean;
  actionTitle: string;
  actionBody: string;
  actionLabel: string;
  actionHref: string;
  backHref: string;
  workspaceHref: string;
  workspaceLabel: string;
};

export type MembershipCheckoutModel = {
  audience: MembershipAudience;
  plan: MembershipPlan;
  currentPlan: MembershipPlan;
  currentStatus: MembershipStatus;
  hero: {
    eyebrow: string;
    title: string;
    body: string;
  };
  summary: {
    tierLabel: string;
    currentState: string;
    paymentStateLabel: string;
    processingNote: string;
  };
  billing: {
    mode: MembershipCheckoutBillingMode;
    providerLabel: string;
    disabledReason: string | null;
    truthLabel: string;
  };
  paymentMethods: Array<{
    key: MembershipPaymentMethodKey;
    label: string;
    state: "default" | "locked";
    statusLabel: string;
  }>;
  paymentPanels: Record<MembershipPaymentMethodKey, {
    title: string;
    summary: string;
    detail: string;
    fields: string[];
  }>;
  explanation: {
    title: string;
    whatItIs: string;
    liveNow: string;
    staged: string;
    afterSubmitTitle: string;
    afterSubmitBody: string;
  };
  navigation: {
    membershipHref: string;
    membershipLabel: string;
    workspaceHref: string;
    workspaceLabel: string;
  };
  billingPortal: {
    enabled: boolean;
    label: string;
    note: string;
  };
  submitLabel: string;
};

function isPlanTabKey(value: MembershipTabKey) {
  return value === MEMBERSHIP_PLAN.PRO || value === MEMBERSHIP_PLAN.ELITE;
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
    title: "Choose the Vendor PAT membership tier that matches your market motion",
    body:
      "Vendor membership should stay simple: make the live Pro scope clear, keep the staged Elite layer honest, and move into the checkout scaffold only when the stronger tier is actually needed.",
    plans: {
      FREE: {
        title: "Free keeps the vendor PAT baseline visible",
        summary: "Free is the operating floor for keeping your current vendor PAT profile and route access coherent.",
        what:
          "It keeps your vendor portal, profile state, and current PAT orientation in one place without asking buyers to trust a heavier commercial promise yet.",
        why:
          "This helps early-stage or locally reviewed vendors hold a clean baseline before they need deeper alignment packaging.",
        ctaTitle: "Step into Pro when you want stronger buyer-facing positioning",
        ctaBody: "Move into the Pro checkout scaffold to stage richer alignment readouts and a clearer commercial handoff.",
      },
      PRO: {
        title: "Pro packages vendor alignment into a stronger commercial surface",
        summary: "Pro is for vendors who need more than a passive profile and want explainable PAT signal available in the live portal.",
        what:
          "Pro is the live vendor operating tier for product assessment, product intelligence, and vendor alignment insight routes grounded in current PAT evidence.",
        why:
          "That helps a vendor turn assessment signal into usable sales and product-readiness framing instead of leaving insights implicit.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Open the checkout scaffold to stage Pro membership and the associated commercial handoff cleanly.",
      },
      ELITE: {
        title: "Elite is reserved for the highest-confidence vendor intelligence layer",
        summary: "Elite is the future tier for benchmarked or projection-backed surfaces that PAT should not overstate before they are ready.",
        what:
          "Elite is the staged next layer for richer benchmark, scenario, and projection packaging once the supporting evidence and payment rails exist.",
        why:
          "This keeps the vendor promise disciplined: stronger value only appears when the intelligence can be defended.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Use the checkout scaffold to mark Elite interest without pretending the final commercial layer is already live.",
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
    title: "Set the Firm PAT membership tier that matches how your firm wants to work",
    body:
      "Firm membership should make the live Pro scope legible, keep the staged Elite layer honest, and show a clean upgrade handoff without inventing a broader firm product suite.",
    plans: {
      FREE: {
        title: "Free keeps the firm PAT core in place",
        summary: "Free gives the firm a stable baseline for structured alignment, profile continuity, and practical PAT orientation.",
        what:
          "It supports the core firm workspace and current PAT foundation without implying a larger intelligence package than the firm is ready to use.",
        why:
          "That helps a firm adopt PAT in a controlled way before it needs broader insight packaging or stronger internal rollout support.",
        ctaTitle: "Move toward Pro when the firm needs stronger operating guidance",
        ctaBody: "Start the checkout scaffold to stage a firmer PAT operating tier without adding payment complexity yet.",
      },
      PRO: {
        title: "Pro turns the live firm alignment insight layer into a clearer operating surface",
        summary: "Pro is the current firm membership tier for firms that want the live alignment insight route packaged more explicitly for leadership use.",
        what:
          "Pro is the current firm operating tier for alignment assessment, firm alignment insights, and firm product review routes backed by the live PAT evidence model.",
        why:
          "That matters when leadership needs clearer interpretation of readiness, change posture, automation capacity, and governance signal from the existing PAT evidence.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Open the checkout scaffold to stage the firm alignment-insight tier without over-claiming broader firm product scope.",
      },
      ELITE: {
        title: "Elite is the staged higher-order firm insight tier",
        summary: "Elite remains the visible but still staged extension of the firm alignment insight surface.",
        what:
          "Elite is reserved for richer firm insight packaging that should stay attached to alignment evidence until PAT can support a stronger premium layer honestly.",
        why:
          "That keeps the firm promise honest while still making the higher-order tier legible.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Use the checkout scaffold to register Elite intent without implying a broader firm intelligence suite is already live.",
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
    title: "Choose the Individual PAT membership tier that matches your personal operating depth",
    body:
      "Individual membership should make the live Pro path clear, keep the staged Elite layer explicit, and move into the checkout scaffold only when the stronger tier is actually wanted.",
    plans: {
      FREE: {
        title: "Free keeps the individual PAT baseline available",
        summary: "Free is the lightest way to keep a personal PAT subject, profile, and orientation path visible.",
        what:
          "It gives the individual a stable entry point into PAT without claiming a deeper guidance layer than the current use case needs.",
        why:
          "That matters for people who want clarity and continuity first, before they commit to a stronger ongoing intelligence layer.",
        ctaTitle: "Step into Pro when you want stronger guidance",
        ctaBody: "Open the checkout scaffold to move toward a richer personal PAT tier without adding real payment logic yet.",
      },
      PRO: {
        title: "Pro gives the individual a stronger personal PAT layer",
        summary: "Pro is for individuals who want more explicit interpretation and a more meaningful readout from PAT.",
        what:
          "Pro is the live individual operating tier for the person-level alignment assessment and the current individual insight route PAT can support from real subject-backed state.",
        why:
          "That helps the individual turn PAT from a one-time assessment into a steadier operating aid.",
        ctaTitle: "Upgrade into Pro",
        ctaBody: "Use the checkout scaffold to stage a stronger personal tier with a direct, non-ambiguous handoff.",
      },
      ELITE: {
        title: "Elite stays reserved for the most advanced personal intelligence layer",
        summary: "Elite is the future tier for premium intelligence packaging that should remain staged until it is honestly supported.",
        what:
          "Elite is where deeper premium features could live later without forcing them into the current product prematurely.",
        why:
          "That keeps the individual promise grounded while still making the future tier visible.",
        ctaTitle: "Stage the Elite path",
        ctaBody: "Route into the checkout scaffold to register Elite intent without implying that the final premium layer is already complete.",
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

  if (normalizedTab === MEMBERSHIP_PLAN.PRO || normalizedTab === MEMBERSHIP_PLAN.ELITE) {
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
    { key: MEMBERSHIP_PLAN.PRO as MembershipTabKey, label: "Pro Membership" },
    { key: MEMBERSHIP_PLAN.ELITE as MembershipTabKey, label: "Elite Membership" },
    { key: "HELP" as MembershipTabKey, label: "Help" },
  ];
}

export function getRequestedMembershipPaymentMethod(
  rawMethod: string | undefined
): MembershipPaymentMethodKey {
  const normalized = rawMethod?.trim().toLowerCase();

  if (
    normalized === "bank" ||
    normalized === "paypal" ||
    normalized === "stripe" ||
    normalized === "square"
  ) {
    return normalized;
  }

  return "card";
}

export function getDefaultMembershipTab(plan: MembershipPlan): MembershipTabKey {
  return normalizeMembershipPlan(plan) === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
}

export function getMembershipStatusSummary(status: MembershipStatus) {
  return formatMembershipValue(status);
}

export function getRequestedCheckoutPlan(rawPlan: string | undefined, currentPlan: MembershipPlan) {
  const normalizedCurrentPlan = normalizeMembershipPlan(currentPlan);
  const normalizedRawPlan = rawPlan?.trim().toUpperCase();

  if (normalizedRawPlan === MEMBERSHIP_PLAN.PRO || normalizedRawPlan === MEMBERSHIP_PLAN.ELITE) {
    return normalizedRawPlan;
  }

  return normalizedCurrentPlan === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
}

function getMembershipScopeNote(audience: MembershipAudience, plan: MembershipPlan) {
  if (audience === "vendor") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "The baseline vendor state keeps sign-in, workspace entry, profile continuity, and membership plumbing coherent. It does not open the core vendor assessment and insight surfaces.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "Pro is the current minimum tier for the core vendor assessment and insight routes. It stays grounded in current PAT signal rather than benchmark or projection claims.";
    }

    return "Elite is visible as the higher vendor intelligence tier, but its benchmark, scenario, and richer premium packaging remain staged rather than fully unlocked today.";
  }

  if (audience === "firm") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "The baseline firm state keeps sign-in, workspace entry, and membership state coherent without opening the core firm assessment and insight routes.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "Current firm Pro scope covers the core firm assessment and insight routes PAT can support now. It is not a separate paid contract for admin, advisory, or broader firm product intelligence behavior.";
    }

    return "Current firm Elite remains a staged higher-order firm insight layer attached to the alignment insight surface. It does not unlock a broader firm product suite today.";
  }

  if (plan === MEMBERSHIP_PLAN.FREE) {
    return "The baseline individual state keeps sign-in, workspace entry, profile continuity, and the person-subject path available without opening the core assessment and insight routes.";
  }

  if (plan === MEMBERSHIP_PLAN.PRO) {
    return "Current individual Pro scope is the minimum tier for the live individual assessment and insight routes PAT can support from person-level alignment state now.";
  }

  return "Individual Elite stays staged and explanation-first. It does not imply a full personal benchmark, projection, or coaching engine is already live.";
}

function getMembershipLiveNowNote(audience: MembershipAudience, plan: MembershipPlan) {
  if (audience === "vendor") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "The baseline vendor workspace, profile state, help routes, and membership plumbing are already live and route-backed.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "The live vendor Pro framing appears today across vendor product intelligence and vendor alignment insight surfaces.";
    }

    return "The Elite vendor layer is currently represented through locked cards and detail routes that stay visible without overstating the premium layer.";
  }

  if (audience === "firm") {
    if (plan === MEMBERSHIP_PLAN.FREE) {
      return "The live firm baseline is the workspace, help, and membership/account state already present in PAT.";
    }

    if (plan === MEMBERSHIP_PLAN.PRO) {
      return "The live firm Pro layer is the firm insights surface backed by alignment-module and capability signal.";
    }

    return "The live firm Elite expression is still the locked higher-order layer inside the firm insights surface.";
  }

  if (plan === MEMBERSHIP_PLAN.FREE) {
    return "The individual baseline is the workspace, profile continuity, help path, and subject-aware membership plumbing already present in PAT.";
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

  return "Elite remains staged until PAT has a real premium personal layer instead of a thin scaffold.";
}

function getMembershipWorkspaceLink(audience: MembershipAudience) {
  if (audience === "vendor") {
    return {
      href: "/vendor",
      label: "Open vendor workspace",
    };
  }

  if (audience === "firm") {
    return {
      href: "/firm",
      label: "Open firm workspace",
    };
  }

  return {
    href: "/user",
    label: "Open individual workspace",
  };
}

function getMembershipPaymentMethodOptions(billingMode: MembershipCheckoutBillingMode) {
  if (billingMode === "provider") {
    return [
      { key: "stripe" as const, label: "Stripe-hosted checkout", state: "default" as const, statusLabel: "Configured" },
    ];
  }

  return [
    { key: "card" as const, label: "Card readiness", state: "default" as const, statusLabel: "Scaffold" },
    { key: "bank" as const, label: "Billing contact", state: "default" as const, statusLabel: "Scaffold" },
    { key: "paypal" as const, label: "PayPal", state: "locked" as const, statusLabel: "Future" },
    { key: "stripe" as const, label: "Stripe", state: "locked" as const, statusLabel: "Future" },
    { key: "square" as const, label: "Square", state: "locked" as const, statusLabel: "Future" },
  ];
}

function getMembershipPaymentMethodPanel(
  method: MembershipPaymentMethodKey,
  audience: MembershipAudience
) {
  if (method === "bank") {
    return {
      title: "Billing-contact scaffold",
      summary: "Collect non-sensitive billing contact details PAT can use before a real bank-debit integration exists.",
      detail:
        "This panel is a non-live scaffold only. PAT records checkout intent, but it does not debit an account or connect to a banking processor yet.",
      fields: [
        "Billing contact name",
        "Accounts payable email",
        "Future bank customer reference",
        "Billing cadence note",
      ],
    };
  }

  if (method === "paypal") {
    return {
      title: "PayPal integration path",
      summary: "Show the future PayPal collection shape without pretending a live PayPal session already exists.",
      detail:
        "PAT does not open a PayPal session here today. Use this panel only as a future-integration preview while the scaffold membership row remains the real output.",
      fields: [
        "PayPal account email",
        "Preferred billing contact",
        "Future PayPal authorization reference",
      ],
    };
  }

  if (method === "stripe") {
    return {
      title: "Stripe-hosted checkout",
      summary: "Stripe collects payment method details on its hosted checkout surface when billing is configured.",
      detail:
        "PAT stores Stripe customer, checkout session, subscription, invoice, and webhook references only. PAT does not store raw card numbers or security codes.",
      fields: [
        "Billing contact email",
        "Billing contact name",
        "Provider customer reference",
      ],
    };
  }

  if (method === "square") {
    return {
      title: "Square integration path",
      summary: "Keep the Square option legible for future card processing without implying the SDK or hosted fields are live.",
      detail:
        "PAT does not initialize a Square payment form here today. This panel exists only to keep the future provider path visible while processing remains non-live.",
      fields: [
        "Future Square buyer contact",
        "Future payment token reference",
        "Future location reference",
      ],
    };
  }

  return {
    title: "Card readiness scaffold",
    summary: "Collect non-sensitive billing contact details only while staying explicit that PAT is not charging a card here.",
    detail:
      audience === "individual"
        ? "PAT records individual membership checkout intent only. No card processor, tokenization step, card number, or live charge is accepted on this page."
        : "PAT records organization-level membership checkout intent only. No card processor, tokenization step, card number, or live charge is accepted on this page.",
    fields: [
      "Billing contact name",
      "Billing contact email",
      "Future provider customer reference",
      "Internal billing note",
    ],
  };
}

function getMembershipHelpCards(
  audience: MembershipAudience,
  content: MembershipAudienceContent
): MembershipHelpCard[] {
  return [
    {
      title: "Baseline state",
      body: `${content.plans.FREE.summary} ${getMembershipScopeNote(audience, MEMBERSHIP_PLAN.FREE)}`,
    },
    {
      title: "Pro membership",
      body: `${content.plans.PRO.summary} ${getMembershipScopeNote(audience, MEMBERSHIP_PLAN.PRO)}`,
    },
    {
      title: "Elite membership",
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
  const workspaceLink = getMembershipWorkspaceLink(input.audience);

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
    sections: [
      {
        title: "What it is",
        body: planContent.what,
      },
      {
        title: "Live now",
        body: getMembershipLiveNowNote(input.audience, selectedPlan),
      },
      {
        title: "Still staged",
        body: getMembershipStagedNote(input.audience, selectedPlan),
      },
      {
        title: "Why it helps",
        body: planContent.why,
      },
    ],
    ownsPlan,
    actionTitle:
      ownsPlan && selectedPlan === MEMBERSHIP_PLAN.FREE
        ? "Stage Pro membership"
        : ownsPlan
          ? `Continue with ${formatMembershipValue(selectedPlan)}`
          : `Stage ${formatMembershipValue(checkoutPlan)} membership`,
    actionBody:
      ownsPlan && selectedPlan === MEMBERSHIP_PLAN.FREE
        ? "Free remains the current baseline. Move into the Pro checkout scaffold only when you want the live paid tier PAT can support now."
        : ownsPlan
          ? `This audience is already on ${formatMembershipValue(selectedPlan)}. The checkout scaffold remains non-live and records intent only so PAT can keep the payment handoff honest.`
          : `${planContent.ctaBody} The checkout remains a scaffold only and does not create a live charge yet.`,
    actionLabel:
      ownsPlan && selectedPlan === MEMBERSHIP_PLAN.FREE
        ? "Open Pro checkout scaffold"
        : ownsPlan
          ? "Open current tier checkout scaffold"
          : `Open ${formatMembershipValue(checkoutPlan)} checkout scaffold`,
    actionHref: buildMembershipCheckoutHref(input.audience, checkoutPlan),
    backHref:
      selectedPlan === MEMBERSHIP_PLAN.PRO || selectedPlan === MEMBERSHIP_PLAN.ELITE
        ? `${getMembershipPathPrefix(input.audience)}/membership?tab=${selectedPlan.toLowerCase()}`
        : `${getMembershipPathPrefix(input.audience)}/membership?tab=pro`,
    workspaceHref: workspaceLink.href,
    workspaceLabel: workspaceLink.label,
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
  const ctaPlan = activeTab;

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
      liveNowNote: getMembershipLiveNowNote(input.audience, activeTab),
      stagedNote: getMembershipStagedNote(input.audience, activeTab),
      ownsPlan,
      ctaTitle: ownsPlan ? `Continue with ${formatMembershipValue(activeTab)}` : planContent.ctaTitle,
      ctaBody: ownsPlan
        ? `Open the ${formatMembershipValue(ctaPlan)} checkout scaffold to continue the current membership handoff cleanly.`
        : planContent.ctaBody,
      ctaHref: buildMembershipCheckoutHref(input.audience, ctaPlan),
      detailHref: buildMembershipTierDetailHref(input.audience, activeTab),
      detailLabel: `Open ${formatMembershipValue(activeTab)} detail`,
    },
  };
}

export function getMembershipCheckoutModel(input: {
  audience: MembershipAudience;
  selectedPlan: MembershipPlan;
  currentPlan: MembershipPlan;
  currentStatus: MembershipStatus;
  billingMode?: MembershipCheckoutBillingMode;
  billingDisabledReason?: string | null;
}): MembershipCheckoutModel {
  const content = MEMBERSHIP_PAGE_CONTENT[input.audience];
  const selectedPlan = normalizeMembershipPlan(input.selectedPlan);
  const currentPlan = normalizeMembershipPlan(input.currentPlan);
  const planContent = content.plans[selectedPlan];
  const workspaceLink = getMembershipWorkspaceLink(input.audience);
  const membershipHref = `${getMembershipPathPrefix(input.audience)}/membership?tab=${selectedPlan.toLowerCase()}`;
  const billingMode = input.billingMode ?? "scaffold";
  const providerBacked = billingMode === "provider";

  return {
    audience: input.audience,
    plan: selectedPlan,
    currentPlan,
    currentStatus: input.currentStatus,
    hero: {
      eyebrow: `${content.eyebrow} checkout`,
      title: providerBacked
        ? `${formatMembershipValue(selectedPlan)} membership checkout`
        : `${formatMembershipValue(selectedPlan)} membership checkout scaffold`,
      body: providerBacked
        ? "Billing is configured for Stripe-hosted checkout. PAT redirects to Stripe for payment collection and stores provider customer, session, subscription, invoice, and webhook references only."
        : "Billing is disabled or missing provider configuration. PAT records explicit checkout intent as scaffold state only; no live charge, card collection, or provider session is created.",
    },
    summary: {
      tierLabel: formatMembershipValue(selectedPlan),
      currentState: `${formatMembershipValue(currentPlan)} / ${getMembershipStatusSummary(input.currentStatus)}`,
      paymentStateLabel: providerBacked ? "Stripe configured" : "Scaffold only",
      processingNote: providerBacked
        ? "Submitting continues to Stripe-hosted checkout. Entitlements remain pending until signed provider webhook proof reconciles an active or trialing subscription."
        : `No live payment processor is active for this plan${input.billingDisabledReason ? ` (${input.billingDisabledReason})` : ""}. Submitting records checkout intent only.`,
    },
    billing: {
      mode: billingMode,
      providerLabel: providerBacked ? "Stripe" : "PAT scaffold",
      disabledReason: input.billingDisabledReason ?? null,
      truthLabel: providerBacked
        ? "Stripe will collect payment details; PAT does not store card numbers."
        : "No live charge will be created.",
    },
    paymentMethods: getMembershipPaymentMethodOptions(billingMode),
    paymentPanels: {
      card: getMembershipPaymentMethodPanel("card", input.audience),
      bank: getMembershipPaymentMethodPanel("bank", input.audience),
      paypal: getMembershipPaymentMethodPanel("paypal", input.audience),
      stripe: getMembershipPaymentMethodPanel("stripe", input.audience),
      square: getMembershipPaymentMethodPanel("square", input.audience),
    },
    explanation: {
      title: `${formatMembershipValue(selectedPlan)} membership value`,
      whatItIs: `${planContent.what} ${planContent.why}`,
      liveNow: getMembershipLiveNowNote(input.audience, selectedPlan),
      staged: getMembershipStagedNote(input.audience, selectedPlan),
      afterSubmitTitle: "What happens after submit",
      afterSubmitBody: providerBacked
        ? "PAT creates a Stripe checkout session, marks the membership as pending checkout, and waits for signed webhook reconciliation before granting paid entitlement."
        : "Submitting this form records checkout intent on the existing membership row and returns PAT to the current membership surface. No processor session, token exchange, or live charge is created.",
    },
    navigation: {
      membershipHref,
      membershipLabel: "Back to membership",
      workspaceHref: workspaceLink.href,
      workspaceLabel: workspaceLink.label,
    },
    billingPortal: {
      enabled: providerBacked,
      label: "Open Stripe customer portal",
      note: providerBacked
        ? "Available after a Stripe customer exists for this subject."
        : "Customer portal is disabled while billing runs in scaffold mode.",
    },
    submitLabel: providerBacked
      ? "Continue to Stripe checkout"
      : `Record ${formatMembershipValue(selectedPlan)} checkout intent`,
  };
}
