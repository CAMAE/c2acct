import {
  type MembershipPlan,
  type MembershipStatus,
  type MembershipSubscription,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { findLocalReviewUserByEmail, isLocalReviewAuthRequested } from "@/lib/auth/localReview";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import {
  resolveMembershipContext,
  type MembershipAudience,
  type MembershipResolvedContext,
} from "@/lib/membershipContext";

export type MembershipSnapshot = {
  audience: MembershipAudience;
  subjectId: string | null;
  displayName: string;
  plan: MembershipPlan;
  status: MembershipStatus;
  source: "database" | "virtual-free" | "local-review-compatibility";
  compatibilityMode: MembershipResolvedContext["compatibilityMode"];
  checkoutHref: string;
  subscription: MembershipSubscription | null;
};

export const MEMBERSHIP_PLAN = {
  FREE: "FREE",
  PRO: "PRO",
  ELITE: "ELITE",
} as const satisfies Record<string, MembershipPlan>;

export const MEMBERSHIP_STATUS = {
  ACTIVE: "ACTIVE",
  TRIAL: "TRIAL",
  PENDING_CHECKOUT: "PENDING_CHECKOUT",
  PAST_DUE: "PAST_DUE",
  CANCELED: "CANCELED",
  INCOMPLETE: "INCOMPLETE",
  UNPAID: "UNPAID",
  PAYMENT_ACTION_REQUIRED: "PAYMENT_ACTION_REQUIRED",
} as const satisfies Record<string, MembershipStatus>;

export const DEFAULT_FREE_MEMBERSHIP_PLAN = MEMBERSHIP_PLAN.FREE;
export const DEFAULT_FREE_MEMBERSHIP_STATUS = MEMBERSHIP_STATUS.ACTIVE;

const MEMBERSHIP_PLAN_RANK: Record<MembershipPlan, number> = {
  [MEMBERSHIP_PLAN.FREE]: 0,
  [MEMBERSHIP_PLAN.PRO]: 1,
  [MEMBERSHIP_PLAN.ELITE]: 2,
};

export type MembershipEntitlementSnapshot = {
  context: MembershipResolvedContext;
  membership: MembershipSnapshot;
  requiredPlan: MembershipPlan;
  allowed: boolean;
  membershipHref: string;
  upgradeHref: string;
};

export type LocalReviewCompatibilityMembership = {
  audience: MembershipAudience;
  plan: MembershipPlan;
  status: MembershipStatus;
};

export function normalizeMembershipPlan(plan: string | MembershipPlan | null | undefined): MembershipPlan {
  if (plan === MEMBERSHIP_PLAN.PRO || plan === MEMBERSHIP_PLAN.ELITE) {
    return plan;
  }

  return DEFAULT_FREE_MEMBERSHIP_PLAN;
}

export function normalizeMembershipStatus(
  status: string | MembershipStatus | null | undefined
): MembershipStatus {
  if (
    status === MEMBERSHIP_STATUS.TRIAL ||
    status === MEMBERSHIP_STATUS.PENDING_CHECKOUT ||
    status === MEMBERSHIP_STATUS.PAST_DUE ||
    status === MEMBERSHIP_STATUS.CANCELED ||
    status === MEMBERSHIP_STATUS.INCOMPLETE ||
    status === MEMBERSHIP_STATUS.UNPAID ||
    status === MEMBERSHIP_STATUS.PAYMENT_ACTION_REQUIRED
  ) {
    return status;
  }

  return DEFAULT_FREE_MEMBERSHIP_STATUS;
}

export function getVirtualFreeMembershipSnapshot(input: {
  audience: MembershipAudience;
  subjectId: string | null;
  displayName: string;
  compatibilityMode: MembershipResolvedContext["compatibilityMode"];
}): MembershipSnapshot {
  return {
    audience: input.audience,
    subjectId: input.subjectId,
    displayName: input.displayName,
    plan: DEFAULT_FREE_MEMBERSHIP_PLAN,
    status: DEFAULT_FREE_MEMBERSHIP_STATUS,
    source: "virtual-free",
    compatibilityMode: input.compatibilityMode,
    checkoutHref: getCheckoutHref(input.audience),
    subscription: null,
  };
}

function getAudiencePrefix(audience: MembershipAudience) {
  if (audience === "individual") {
    return "user";
  }

  return audience;
}

function getCheckoutHref(audience: MembershipAudience) {
  return `/${getAudiencePrefix(audience)}/membership/checkout`;
}

export function getMembershipHref(audience: MembershipAudience) {
  return `/${getAudiencePrefix(audience)}/membership`;
}

export function getMembershipUpgradeHref(audience: MembershipAudience, requiredPlan: MembershipPlan) {
  const safePlan = requiredPlan === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
  return `${getCheckoutHref(audience)}?plan=${safePlan.toLowerCase()}`;
}

export function getMembershipPlanRank(plan: string | MembershipPlan | null | undefined) {
  return MEMBERSHIP_PLAN_RANK[normalizeMembershipPlan(plan)];
}

export function hasMembershipAccess(
  currentPlan: string | MembershipPlan | null | undefined,
  requiredPlan: MembershipPlan
) {
  return getMembershipPlanRank(currentPlan) >= getMembershipPlanRank(requiredPlan);
}

export function isMembershipStatusEntitled(status: string | MembershipStatus | null | undefined) {
  const normalizedStatus = normalizeMembershipStatus(status);
  return normalizedStatus === MEMBERSHIP_STATUS.ACTIVE || normalizedStatus === MEMBERSHIP_STATUS.TRIAL;
}

function isProviderSubscriptionEntitled(subscription: MembershipSubscription | null) {
  if (!subscription || subscription.provider !== "stripe") {
    return true;
  }

  return subscription.providerStatus === "active" || subscription.providerStatus === "trialing";
}

export function isMembershipSnapshotEntitled(membership: Pick<MembershipSnapshot, "status" | "subscription">) {
  return isMembershipStatusEntitled(membership.status) && isProviderSubscriptionEntitled(membership.subscription);
}

export function resolveLocalReviewCompatibilityMembership(
  audience: MembershipAudience,
  email: string | null | undefined
): LocalReviewCompatibilityMembership | null {
  if (!isLocalReviewAuthRequested()) {
    return null;
  }

  const reviewUser = findLocalReviewUserByEmail(email);
  if (audience === "vendor" && reviewUser?.key === "vendor") {
    return {
      audience,
      plan: MEMBERSHIP_PLAN.PRO,
      status: MEMBERSHIP_STATUS.ACTIVE,
    };
  }

  if (audience === "firm" && reviewUser?.key === "firm") {
    return {
      audience,
      plan: MEMBERSHIP_PLAN.PRO,
      status: MEMBERSHIP_STATUS.ACTIVE,
    };
  }

  // Day-26 P0a (RK1): individual audience also needs PRO compatibility for
  // demo. Previously fell through to virtual-FREE which locked Product
  // Intelligence + alignment insights during the pilot walkthrough.
  if (audience === "individual" && reviewUser?.key === "individual") {
    return {
      audience,
      plan: MEMBERSHIP_PLAN.PRO,
      status: MEMBERSHIP_STATUS.ACTIVE,
    };
  }

  return null;
}

function buildLocalReviewCompatibilitySnapshot(input: {
  context: MembershipResolvedContext;
  compatibilityMembership: LocalReviewCompatibilityMembership;
}): MembershipSnapshot {
  return {
    audience: input.context.audience,
    subjectId: input.context.subjectId,
    displayName: input.context.displayName,
    plan: input.compatibilityMembership.plan,
    status: input.compatibilityMembership.status,
    source: "local-review-compatibility",
    compatibilityMode: input.context.compatibilityMode,
    checkoutHref: getCheckoutHref(input.context.audience),
    subscription: null,
  };
}

export async function getMembershipSnapshotForContext(
  context: MembershipResolvedContext
): Promise<MembershipSnapshot> {
  if (!context.subjectId) {
    return getVirtualFreeMembershipSnapshot({
      audience: context.audience,
      subjectId: null,
      displayName: context.displayName,
      compatibilityMode: context.compatibilityMode,
    });
  }

  const subscription = await prisma.membershipSubscription.findUnique({
    where: { subjectId: context.subjectId },
  });

  if (!subscription) {
    return getVirtualFreeMembershipSnapshot({
      audience: context.audience,
      subjectId: context.subjectId,
      displayName: context.displayName,
      compatibilityMode: context.compatibilityMode,
    });
  }

  return {
    audience: context.audience,
    subjectId: context.subjectId,
    displayName: context.displayName,
    plan: normalizeMembershipPlan(subscription.plan),
    status: normalizeMembershipStatus(subscription.status),
    source: "database",
    compatibilityMode: context.compatibilityMode,
    checkoutHref: getCheckoutHref(context.audience),
    subscription,
  };
}

export async function resolveCurrentMembership(
  sessionUser: SessionUser,
  audience: MembershipAudience
) {
  const context = await resolveMembershipContext(sessionUser, audience);
  const membership = await getMembershipSnapshotForContext(context);
  const compatibilityMembership = resolveLocalReviewCompatibilityMembership(audience, sessionUser.email);
  const resolvedMembership =
    compatibilityMembership && !hasMembershipAccess(membership.plan, compatibilityMembership.plan)
      ? buildLocalReviewCompatibilitySnapshot({
          context,
          compatibilityMembership,
        })
      : membership;

  return {
    context,
    membership: resolvedMembership,
  };
}

export async function resolveMembershipEntitlement(
  sessionUser: SessionUser,
  audience: MembershipAudience,
  requiredPlan: MembershipPlan = MEMBERSHIP_PLAN.PRO
): Promise<MembershipEntitlementSnapshot> {
  const { context, membership } = await resolveCurrentMembership(sessionUser, audience);

  return {
    context,
    membership,
    requiredPlan,
    allowed: isMembershipSnapshotEntitled(membership) && hasMembershipAccess(membership.plan, requiredPlan),
    membershipHref: getMembershipHref(audience),
    upgradeHref: getMembershipUpgradeHref(audience, requiredPlan),
  };
}

export async function ensureDefaultFreeMembership(
  sessionUser: SessionUser,
  audience: MembershipAudience
) {
  const context = await resolveMembershipContext(sessionUser, audience);
  if (!context.subjectId) {
    return getMembershipSnapshotForContext(context);
  }

  const subscription = await prisma.membershipSubscription.upsert({
    where: { subjectId: context.subjectId },
    update: {
      plan: DEFAULT_FREE_MEMBERSHIP_PLAN,
      status: DEFAULT_FREE_MEMBERSHIP_STATUS,
      providerStatus: null,
      providerPriceRef: null,
      externalSubscriptionRef: null,
      checkoutRequestedPlan: null,
      checkoutSessionRef: null,
      lastBillingEventType: "membership.free.defaulted",
      lastBillingEventAt: new Date(),
      lastWebhookEventId: null,
      lastReconciledAt: null,
      paymentActionRequiredAt: null,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      subjectId: context.subjectId,
      plan: DEFAULT_FREE_MEMBERSHIP_PLAN,
      status: DEFAULT_FREE_MEMBERSHIP_STATUS,
      provider: "pat-placeholder",
      startedAt: new Date(),
    },
  });

  return {
    audience: context.audience,
    subjectId: context.subjectId,
    displayName: context.displayName,
    plan: normalizeMembershipPlan(subscription.plan),
    status: normalizeMembershipStatus(subscription.status),
    source: "database" as const,
    compatibilityMode: context.compatibilityMode,
    checkoutHref: getCheckoutHref(context.audience),
    subscription,
  };
}

export async function startCheckoutPlaceholderFlow(input: {
  sessionUser: SessionUser;
  audience: MembershipAudience;
  requestedPlan: MembershipPlan;
}) {
  const context = await resolveMembershipContext(input.sessionUser, input.audience);

  if (!context.subjectId) {
    return {
      ok: false as const,
      reason: "subject-unavailable",
      checkoutHref: getCheckoutHref(input.audience),
      membership: await getMembershipSnapshotForContext(context),
    };
  }

  const subscription = await prisma.membershipSubscription.upsert({
    where: { subjectId: context.subjectId },
    update: {
      status: MEMBERSHIP_STATUS.PENDING_CHECKOUT,
      checkoutRequestedPlan: input.requestedPlan,
      checkoutSessionRef: `placeholder:${context.subjectId}:${Date.now()}`,
      provider: "pat-placeholder",
      externalCustomerRef: null,
      externalSubscriptionRef: null,
      providerPriceRef: null,
      providerStatus: "scaffold",
      providerCancelAtPeriodEnd: false,
      lastBillingEventType: "checkout.placeholder.created",
      lastBillingEventAt: new Date(),
      lastWebhookEventId: null,
      lastReconciledAt: null,
      paymentActionRequiredAt: null,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      subjectId: context.subjectId,
      plan: DEFAULT_FREE_MEMBERSHIP_PLAN,
      status: MEMBERSHIP_STATUS.PENDING_CHECKOUT,
      checkoutRequestedPlan: input.requestedPlan,
      checkoutSessionRef: `placeholder:${context.subjectId}:${Date.now()}`,
      provider: "pat-placeholder",
      providerStatus: "scaffold",
      providerCancelAtPeriodEnd: false,
      lastBillingEventType: "checkout.placeholder.created",
      lastBillingEventAt: new Date(),
      startedAt: new Date(),
    },
  });

  return {
    ok: true as const,
    reason: null,
    checkoutHref: getCheckoutHref(input.audience),
    membership: {
      audience: context.audience,
      subjectId: context.subjectId,
      displayName: context.displayName,
      plan: normalizeMembershipPlan(subscription.plan),
      status: normalizeMembershipStatus(subscription.status),
      source: "database" as const,
      compatibilityMode: context.compatibilityMode,
      checkoutHref: getCheckoutHref(context.audience),
      subscription,
    },
  };
}
