import { randomUUID } from "node:crypto";
import { MembershipPlan, MembershipStatus, Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { MEMBERSHIP_PLAN } from "@/lib/membership";
import type { BillingConfig } from "@/lib/billing/config";
import type { StripeEvent, StripeInvoiceLike, StripeSubscriptionLike } from "@/lib/billing/stripe";

type BillingClient = typeof prisma;

function fromUnixSeconds(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value * 1000) : null;
}

export function mapStripeSubscriptionStatusToMembershipStatus(status: string | null | undefined) {
  if (status === "active") return MembershipStatus.ACTIVE;
  if (status === "trialing") return MembershipStatus.TRIAL;
  if (status === "past_due") return MembershipStatus.PAST_DUE;
  if (status === "canceled" || status === "incomplete_expired") return MembershipStatus.CANCELED;
  if (status === "incomplete") return MembershipStatus.INCOMPLETE;
  if (status === "unpaid") return MembershipStatus.UNPAID;
  if (status === "payment_action_required") return MembershipStatus.PAYMENT_ACTION_REQUIRED;
  return MembershipStatus.PENDING_CHECKOUT;
}

export function getEntitledMembershipStatuses() {
  return new Set<MembershipStatus>([MembershipStatus.ACTIVE, MembershipStatus.TRIAL]);
}

export function isMembershipStatusEntitled(status: MembershipStatus | string | null | undefined) {
  return getEntitledMembershipStatuses().has(status as MembershipStatus);
}

function firstSubscriptionPriceId(subscription: StripeSubscriptionLike) {
  return subscription.items?.data?.[0]?.price?.id ?? null;
}

function planFromPriceId(config: BillingConfig, priceId: string | null) {
  if (!priceId) return null;

  for (const audiencePrices of Object.values(config.prices)) {
    for (const [plan, candidate] of Object.entries(audiencePrices)) {
      if (candidate === priceId) {
        return plan as MembershipPlan;
      }
    }
  }

  return null;
}

function planFromProviderSubscription(subscription: StripeSubscriptionLike, config: BillingConfig) {
  const metadataPlan = subscription.metadata?.plan?.toUpperCase();
  if (metadataPlan === MEMBERSHIP_PLAN.PRO || metadataPlan === MEMBERSHIP_PLAN.ELITE) {
    return metadataPlan;
  }

  // An unrecognised price falls back to the FREE placeholder, which grants NO
  // entitlement (normalizeMembershipPlan maps it to NO_MEMBERSHIP). Failing
  // closed here is deliberate: guessing PRO from an unknown price would hand out
  // paid access on a billing misconfiguration.
  return planFromPriceId(config, firstSubscriptionPriceId(subscription)) ?? MEMBERSHIP_PLAN.FREE;
}

export function getSubjectIdFromProviderObject(
  object: { metadata?: Record<string, string | undefined> },
  fallback?: string | null
) {
  return object.metadata?.subjectId || fallback || null;
}

export async function reconcileStripeSubscription(input: {
  subscription: StripeSubscriptionLike;
  config: BillingConfig;
  eventType: string;
  webhookEventId?: string | null;
  client?: BillingClient;
}) {
  const client = input.client ?? prisma;
  const subjectId = getSubjectIdFromProviderObject(input.subscription);
  if (!subjectId) {
    throw new Error(`Stripe subscription ${input.subscription.id} is missing subjectId metadata.`);
  }

  const now = new Date();
  const providerStatus = input.subscription.status ?? "unknown";
  const status = mapStripeSubscriptionStatusToMembershipStatus(providerStatus);
  const priceId = firstSubscriptionPriceId(input.subscription);
  const plan = planFromProviderSubscription(input.subscription, input.config);

  return client.membershipSubscription.upsert({
    where: { subjectId },
    update: {
      plan,
      status,
      provider: "stripe",
      externalCustomerRef: String(input.subscription.customer ?? ""),
      externalSubscriptionRef: input.subscription.id,
      providerPriceRef: priceId,
      providerStatus,
      providerCancelAtPeriodEnd: Boolean(input.subscription.cancel_at_period_end),
      trialEndsAt: fromUnixSeconds(input.subscription.trial_end),
      currentPeriodStart: fromUnixSeconds(input.subscription.current_period_start),
      currentPeriodEnd: fromUnixSeconds(input.subscription.current_period_end),
      canceledAt: fromUnixSeconds(input.subscription.canceled_at),
      lastBillingEventType: input.eventType,
      lastBillingEventAt: now,
      lastWebhookEventId: input.webhookEventId ?? null,
      lastReconciledAt: now,
      paymentActionRequiredAt:
        status === MembershipStatus.PAYMENT_ACTION_REQUIRED ? now : null,
      metadata: input.subscription.metadata ?? {},
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      subjectId,
      plan,
      status,
      provider: "stripe",
      externalCustomerRef: String(input.subscription.customer ?? ""),
      externalSubscriptionRef: input.subscription.id,
      providerPriceRef: priceId,
      providerStatus,
      providerCancelAtPeriodEnd: Boolean(input.subscription.cancel_at_period_end),
      trialEndsAt: fromUnixSeconds(input.subscription.trial_end),
      currentPeriodStart: fromUnixSeconds(input.subscription.current_period_start),
      currentPeriodEnd: fromUnixSeconds(input.subscription.current_period_end),
      canceledAt: fromUnixSeconds(input.subscription.canceled_at),
      startedAt: now,
      lastBillingEventType: input.eventType,
      lastBillingEventAt: now,
      lastWebhookEventId: input.webhookEventId ?? null,
      lastReconciledAt: now,
      paymentActionRequiredAt:
        status === MembershipStatus.PAYMENT_ACTION_REQUIRED ? now : null,
      metadata: input.subscription.metadata ?? {},
    },
  });
}

function paymentIntentRef(invoice: StripeInvoiceLike) {
  if (typeof invoice.payment_intent === "string") return invoice.payment_intent;
  return invoice.payment_intent?.id ?? null;
}

function invoiceFailureMessage(invoice: StripeInvoiceLike) {
  return invoice.last_payment_error?.message ?? null;
}

async function findSubjectIdForInvoice(client: BillingClient, invoice: StripeInvoiceLike) {
  const metadataSubjectId = getSubjectIdFromProviderObject(invoice);
  if (metadataSubjectId) return metadataSubjectId;

  if (invoice.subscription) {
    const subscription = await client.membershipSubscription.findFirst({
      where: {
        provider: "stripe",
        externalSubscriptionRef: invoice.subscription,
      },
      select: { subjectId: true },
    });
    if (subscription?.subjectId) return subscription.subjectId;
  }

  if (invoice.customer) {
    const customer = await client.billingCustomer.findFirst({
      where: {
        provider: "stripe",
        providerCustomerId: invoice.customer,
      },
      select: { subjectId: true },
    });
    if (customer?.subjectId) return customer.subjectId;
  }

  return null;
}

export async function reconcileStripeInvoice(input: {
  invoice: StripeInvoiceLike;
  eventType: string;
  webhookEventId?: string | null;
  client?: BillingClient;
}) {
  const client = input.client ?? prisma;
  const subjectId = await findSubjectIdForInvoice(client, input.invoice);
  const status = input.invoice.status ?? "unknown";
  const now = new Date();

  const invoice = await client.billingInvoice.upsert({
    where: {
      provider_providerInvoiceId: {
        provider: "stripe",
        providerInvoiceId: input.invoice.id,
      },
    },
    update: {
      subjectId,
      providerCustomerId: input.invoice.customer ?? null,
      providerSubscriptionId: input.invoice.subscription ?? null,
      status,
      amountDue: input.invoice.amount_due ?? null,
      amountPaid: input.invoice.amount_paid ?? null,
      currency: input.invoice.currency ?? null,
      hostedInvoiceUrl: input.invoice.hosted_invoice_url ?? null,
      invoicePdf: input.invoice.invoice_pdf ?? null,
      paymentIntentRef: paymentIntentRef(input.invoice),
      lastPaymentError: invoiceFailureMessage(input.invoice),
      raw: input.invoice,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      subjectId,
      provider: "stripe",
      providerInvoiceId: input.invoice.id,
      providerCustomerId: input.invoice.customer ?? null,
      providerSubscriptionId: input.invoice.subscription ?? null,
      status,
      amountDue: input.invoice.amount_due ?? null,
      amountPaid: input.invoice.amount_paid ?? null,
      currency: input.invoice.currency ?? null,
      hostedInvoiceUrl: input.invoice.hosted_invoice_url ?? null,
      invoicePdf: input.invoice.invoice_pdf ?? null,
      paymentIntentRef: paymentIntentRef(input.invoice),
      lastPaymentError: invoiceFailureMessage(input.invoice),
      raw: input.invoice,
    },
  });

  if (
    subjectId
    && (input.eventType === "invoice.payment_failed"
      || input.eventType === "invoice.payment_action_required")
  ) {
    await client.membershipSubscription.update({
      where: { subjectId },
      data: {
        status:
          input.eventType === "invoice.payment_action_required"
            ? MembershipStatus.PAYMENT_ACTION_REQUIRED
            : MembershipStatus.PAST_DUE,
        providerStatus:
          input.eventType === "invoice.payment_action_required"
            ? "payment_action_required"
            : "past_due",
        lastBillingEventType: input.eventType,
        lastBillingEventAt: now,
        lastWebhookEventId: input.webhookEventId ?? null,
        lastReconciledAt: now,
        paymentActionRequiredAt:
          input.eventType === "invoice.payment_action_required" ? now : undefined,
        updatedAt: now,
      },
    }).catch(() => null);
  }

  return invoice;
}

export async function persistStripeWebhookEvent(input: {
  event: StripeEvent;
  client?: BillingClient;
}) {
  const client = input.client ?? prisma;
  const existing = await client.billingWebhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider: "stripe",
        providerEventId: input.event.id,
      },
    },
  });

  if (existing?.processedAt) {
    return {
      record: existing,
      duplicate: true,
      shouldProcess: false,
    };
  }

  if (existing) {
    return { record: existing, duplicate: false, shouldProcess: true };
  }

  // Idempotency race hardening (B4): findUnique + create is not atomic. Two
  // concurrent deliveries of the SAME event id can both pass the findUnique
  // above; the unique [provider, providerEventId] makes the second create throw
  // P2002. The loser must NOT double-process — re-fetch and defer to the winner.
  try {
    const record = await client.billingWebhookEvent.create({
      data: {
        id: randomUUID(),
        provider: "stripe",
        providerEventId: input.event.id,
        eventType: input.event.type,
        apiVersion: input.event.api_version ?? null,
        livemode: Boolean(input.event.livemode),
        payload: input.event as unknown as Prisma.InputJsonValue,
        processingStatus: "received",
      },
    });
    return { record, duplicate: false, shouldProcess: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await client.billingWebhookEvent.findUnique({
        where: {
          provider_providerEventId: { provider: "stripe", providerEventId: input.event.id },
        },
      });
      // The unique constraint fired, so the row must exist — defer to the winner.
      if (raced) {
        return { record: raced, duplicate: true, shouldProcess: false };
      }
    }
    throw error;
  }
}

export async function processStripeWebhookEvent(input: {
  event: StripeEvent;
  config: BillingConfig;
  client?: BillingClient;
}) {
  const client = input.client ?? prisma;
  const persisted = await persistStripeWebhookEvent({ event: input.event, client });
  if (!persisted.shouldProcess) {
    return {
      ok: true,
      duplicate: true,
      processed: false,
      record: persisted.record,
    };
  }

  try {
    if (
      input.event.type === "customer.subscription.created"
      || input.event.type === "customer.subscription.updated"
      || input.event.type === "customer.subscription.deleted"
    ) {
      await reconcileStripeSubscription({
        subscription: input.event.data.object as StripeSubscriptionLike,
        config: input.config,
        eventType: input.event.type,
        webhookEventId: persisted.record.id,
        client,
      });
    }

    if (
      input.event.type === "invoice.payment_failed"
      || input.event.type === "invoice.payment_action_required"
      || input.event.type === "invoice.paid"
    ) {
      await reconcileStripeInvoice({
        invoice: input.event.data.object as StripeInvoiceLike,
        eventType: input.event.type,
        webhookEventId: persisted.record.id,
        client,
      });
    }

    await client.billingWebhookEvent.update({
      where: { id: persisted.record.id },
      data: {
        processingStatus: "processed",
        processedAt: new Date(),
      },
    });

    return {
      ok: true,
      duplicate: false,
      processed: true,
      record: persisted.record,
    };
  } catch (error) {
    await client.billingWebhookEvent.update({
      where: { id: persisted.record.id },
      data: {
        processingStatus: "failed",
        processingError: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
