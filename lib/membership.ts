import {
  type MembershipPlan,
  type MembershipStatus,
  type MembershipSubscription,
} from "@prisma/client";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildMembershipBillingSummary } from "@/lib/billing";
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
  source: "database" | "virtual-free";
  compatibilityMode: MembershipResolvedContext["compatibilityMode"];
  checkoutHref: string;
  subscription: MembershipSubscription | null;
  billingSummary: Awaited<ReturnType<typeof buildMembershipBillingSummary>> | null;
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
} as const satisfies Record<string, MembershipStatus>;

export const DEFAULT_FREE_MEMBERSHIP_PLAN = MEMBERSHIP_PLAN.FREE;
export const DEFAULT_FREE_MEMBERSHIP_STATUS = MEMBERSHIP_STATUS.ACTIVE;

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
    status === MEMBERSHIP_STATUS.CANCELED
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
    billingSummary: null,
  };
}

function getAudiencePrefix(audience: MembershipAudience) {
  if (audience === "individual") {
    return "user";
  }

  return audience;
}

function getCheckoutHref(audience: MembershipAudience) {
  return `/${getAudiencePrefix(audience)}/membership/payment-processing`;
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
  const billingSummary = await buildMembershipBillingSummary(context.subjectId);

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
    billingSummary,
  };
}

export async function resolveCurrentMembership(
  sessionUser: SessionUser,
  audience: MembershipAudience
) {
  const context = await resolveMembershipContext(sessionUser, audience);
  const membership = await getMembershipSnapshotForContext(context);

  return {
    context,
    membership,
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
      checkoutRequestedPlan: null,
      checkoutSessionRef: null,
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
    billingSummary: await buildMembershipBillingSummary(context.subjectId),
  };
}
