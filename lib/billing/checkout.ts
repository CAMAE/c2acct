import { randomUUID } from "node:crypto";
import type { MembershipPlan } from "@prisma/client";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import {
  type BillingConfig,
  getBillingConfig,
  getBillingModeForPlan,
} from "@/lib/billing/config";
import {
  createStripeCheckoutSession,
  createStripeCustomer,
} from "@/lib/billing/stripe";
import { resolveOrCreateBillingCustomer } from "@/lib/billing/customers";
import {
  DEFAULT_FREE_MEMBERSHIP_PLAN,
  MEMBERSHIP_PLAN,
  MEMBERSHIP_STATUS,
  getMembershipSnapshotForContext,
  normalizeMembershipPlan,
  normalizeMembershipStatus,
  startCheckoutPlaceholderFlow,
} from "@/lib/membership";
import type { MembershipAudience } from "@/lib/membershipContext";

type BillingCheckoutClient = typeof prisma;

export type StripeCheckoutCreator = typeof createStripeCheckoutSession;

function getAudiencePathPrefix(audience: MembershipAudience) {
  return audience === "individual" ? "/user" : `/${audience}`;
}

function buildProviderUrls(input: {
  appBaseUrl: string;
  audience: MembershipAudience;
  plan: MembershipPlan;
}) {
  const prefix = getAudiencePathPrefix(input.audience);
  const plan = input.plan.toLowerCase();

  return {
    successUrl: `${input.appBaseUrl}${prefix}/membership?checkout=provider&plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${input.appBaseUrl}${prefix}/membership/checkout?plan=${plan}&billing=cancelled`,
  };
}

export async function startMembershipCheckoutFlow(input: {
  sessionUser: SessionUser;
  audience: MembershipAudience;
  requestedPlan: MembershipPlan;
  config?: BillingConfig;
  client?: BillingCheckoutClient;
  createCheckoutSession?: StripeCheckoutCreator;
  createCustomer?: typeof createStripeCustomer;
}) {
  const config = input.config ?? getBillingConfig();
  const client = input.client ?? prisma;
  const requestedPlan =
    input.requestedPlan === MEMBERSHIP_PLAN.ELITE ? MEMBERSHIP_PLAN.ELITE : MEMBERSHIP_PLAN.PRO;
  const mode = getBillingModeForPlan({
    config,
    audience: input.audience,
    plan: requestedPlan,
  });

  if (mode.mode === "disabled") {
    const fallback = await startCheckoutPlaceholderFlow({
      sessionUser: input.sessionUser,
      audience: input.audience,
      requestedPlan,
    });

    return {
      ...fallback,
      mode: "scaffold" as const,
      provider: "pat-placeholder" as const,
      billingDisabledReason: mode.reason,
      redirectUrl: null,
      checkoutSessionRef: fallback.ok ? fallback.membership.subscription?.checkoutSessionRef ?? null : null,
      priceId: null,
      customerId: null,
    };
  }

  const customerResult = await resolveOrCreateBillingCustomer({
    sessionUser: input.sessionUser,
    audience: input.audience,
    config,
    client,
    createCustomer: input.createCustomer,
  });

  if (!customerResult.ok) {
    return {
      ok: false as const,
      mode: "provider" as const,
      provider: config.provider,
      reason: customerResult.reason,
      billingDisabledReason: null,
      redirectUrl: null,
      checkoutSessionRef: null,
      priceId: mode.priceId,
      customerId: null,
      checkoutHref: `${getAudiencePathPrefix(input.audience)}/membership/checkout`,
      membership: await getMembershipSnapshotForContext(customerResult.context),
    };
  }

  if (!config.secretKey) {
    return {
      ok: false as const,
      mode: "provider" as const,
      provider: config.provider,
      reason: "missing-stripe-secret-key",
      billingDisabledReason: null,
      redirectUrl: null,
      checkoutSessionRef: null,
      priceId: mode.priceId,
      customerId: customerResult.customer.providerCustomerId,
      checkoutHref: `${getAudiencePathPrefix(input.audience)}/membership/checkout`,
      membership: await getMembershipSnapshotForContext(customerResult.context),
    };
  }

  const subjectId = customerResult.context.subjectId;
  if (!subjectId) {
    return {
      ok: false as const,
      mode: "provider" as const,
      provider: config.provider,
      reason: "subject-unavailable",
      billingDisabledReason: null,
      redirectUrl: null,
      checkoutSessionRef: null,
      priceId: mode.priceId,
      customerId: customerResult.customer.providerCustomerId,
      checkoutHref: `${getAudiencePathPrefix(input.audience)}/membership/checkout`,
      membership: await getMembershipSnapshotForContext(customerResult.context),
    };
  }

  const createCheckoutSession = input.createCheckoutSession ?? createStripeCheckoutSession;
  const urls = buildProviderUrls({
    appBaseUrl: config.appBaseUrl,
    audience: input.audience,
    plan: requestedPlan,
  });
  const metadata: Record<string, string> = {
    subjectId,
    audience: input.audience,
    plan: requestedPlan,
    sessionUserId: input.sessionUser.id,
  };
  const session = await createCheckoutSession({
    secretKey: config.secretKey,
    customerId: customerResult.customer.providerCustomerId,
    priceId: mode.priceId,
    successUrl: urls.successUrl,
    cancelUrl: urls.cancelUrl,
    clientReferenceId: subjectId,
    metadata,
  });

  if (!session.url) {
    return {
      ok: false as const,
      mode: "provider" as const,
      provider: config.provider,
      reason: "checkout-url-unavailable",
      billingDisabledReason: null,
      redirectUrl: null,
      checkoutSessionRef: session.id,
      priceId: mode.priceId,
      customerId: customerResult.customer.providerCustomerId,
      checkoutHref: `${getAudiencePathPrefix(input.audience)}/membership/checkout`,
      membership: await getMembershipSnapshotForContext(customerResult.context),
    };
  }

  const now = new Date();
  const existingMembership = await getMembershipSnapshotForContext(customerResult.context);
  const subscription = await client.membershipSubscription.upsert({
    where: { subjectId },
    update: {
      provider: config.provider,
      externalCustomerRef: customerResult.customer.providerCustomerId,
      externalSubscriptionRef: typeof session.subscription === "string" ? session.subscription : null,
      providerPriceRef: mode.priceId,
      providerStatus: "checkout_session_created",
      providerCancelAtPeriodEnd: false,
      checkoutRequestedPlan: requestedPlan,
      checkoutSessionRef: session.id,
      status: MEMBERSHIP_STATUS.PENDING_CHECKOUT,
      lastBillingEventType: "checkout.session.created",
      lastBillingEventAt: now,
      lastWebhookEventId: null,
      paymentActionRequiredAt: null,
      metadata,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      subjectId,
      plan: normalizeMembershipPlan(existingMembership.plan) || DEFAULT_FREE_MEMBERSHIP_PLAN,
      status: MEMBERSHIP_STATUS.PENDING_CHECKOUT,
      provider: config.provider,
      externalCustomerRef: customerResult.customer.providerCustomerId,
      externalSubscriptionRef: typeof session.subscription === "string" ? session.subscription : null,
      providerPriceRef: mode.priceId,
      providerStatus: "checkout_session_created",
      providerCancelAtPeriodEnd: false,
      checkoutRequestedPlan: requestedPlan,
      checkoutSessionRef: session.id,
      startedAt: now,
      lastBillingEventType: "checkout.session.created",
      lastBillingEventAt: now,
      metadata,
    },
  });

  return {
    ok: true as const,
    mode: "provider" as const,
    provider: config.provider,
    reason: null,
    billingDisabledReason: null,
    redirectUrl: session.url,
    checkoutSessionRef: session.id,
    priceId: mode.priceId,
    customerId: customerResult.customer.providerCustomerId,
    checkoutHref: `${getAudiencePathPrefix(input.audience)}/membership/checkout`,
    membership: {
      audience: customerResult.context.audience,
      subjectId: customerResult.context.subjectId,
      displayName: customerResult.context.displayName,
      plan: normalizeMembershipPlan(subscription.plan),
      status: normalizeMembershipStatus(subscription.status),
      source: "database" as const,
      compatibilityMode: customerResult.context.compatibilityMode,
      checkoutHref: `${getAudiencePathPrefix(input.audience)}/membership/checkout`,
      subscription,
    },
  };
}
