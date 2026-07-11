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

/**
 * Resolved plan (B5-6). The DB enum keeps FREE (not foreclosed — a possible future
 * individual tier is Cam's decision), but the RESOLVER never surfaces FREE: an
 * account without a paid membership resolves to the explicit NO_MEMBERSHIP state
 * (no product access, support/upgrade copy). Nothing is structurally free.
 */
export const NO_MEMBERSHIP = "NO_MEMBERSHIP" as const;
export type ResolvedMembershipPlan = MembershipPlan | typeof NO_MEMBERSHIP;

export type MembershipSnapshot = {
  audience: MembershipAudience;
  subjectId: string | null;
  displayName: string;
  plan: ResolvedMembershipPlan;
  status: MembershipStatus;
  source: "database" | "no-membership" | "local-review-compatibility";
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

/** DB placeholder status for a subscription row that carries no entitlement. */
const NO_MEMBERSHIP_STATUS = MEMBERSHIP_STATUS.CANCELED;

const MEMBERSHIP_PLAN_RANK: Record<ResolvedMembershipPlan, number> = {
  [NO_MEMBERSHIP]: -1,
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

/** Resolver plan normalization — never returns FREE (B5-6); FREE/unknown → NO_MEMBERSHIP. */
export function normalizeMembershipPlan(
  plan: string | MembershipPlan | null | undefined
): ResolvedMembershipPlan {
  if (plan === MEMBERSHIP_PLAN.PRO || plan === MEMBERSHIP_PLAN.ELITE) {
    return plan;
  }
  return NO_MEMBERSHIP;
}

/** DB-safe plan for subscription writes: NO_MEMBERSHIP → FREE placeholder. */
export function toDbMembershipPlan(plan: ResolvedMembershipPlan | string | null | undefined): MembershipPlan {
  if (plan === MEMBERSHIP_PLAN.PRO || plan === MEMBERSHIP_PLAN.ELITE) {
    return plan;
  }
  return MEMBERSHIP_PLAN.FREE;
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

  return MEMBERSHIP_STATUS.ACTIVE;
}

/** B5-6: an account without a paid membership → explicit no-membership state. */
export function getNoMembershipSnapshot(input: {
  audience: MembershipAudience;
  subjectId: string | null;
  displayName: string;
  compatibilityMode: MembershipResolvedContext["compatibilityMode"];
}): MembershipSnapshot {
  return {
    audience: input.audience,
    subjectId: input.subjectId,
    displayName: input.displayName,
    plan: NO_MEMBERSHIP,
    status: NO_MEMBERSHIP_STATUS,
    source: "no-membership",
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
    return getNoMembershipSnapshot({
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
    return getNoMembershipSnapshot({
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
      // DB placeholder row for a not-yet-paid checkout; entitlement gated by status.
      plan: MEMBERSHIP_PLAN.FREE,
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
