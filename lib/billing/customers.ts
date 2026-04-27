import { randomUUID } from "node:crypto";
import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import { type BillingConfig, getBillingConfig } from "@/lib/billing/config";
import { createStripeCustomer } from "@/lib/billing/stripe";
import type { MembershipAudience } from "@/lib/membershipContext";
import { resolveMembershipContext } from "@/lib/membershipContext";

type BillingCustomerClient = typeof prisma;

export type StripeCustomerCreator = typeof createStripeCustomer;

export async function resolveOrCreateBillingCustomer(input: {
  sessionUser: SessionUser;
  audience: MembershipAudience;
  config?: BillingConfig;
  client?: BillingCustomerClient;
  createCustomer?: StripeCustomerCreator;
}) {
  const config = input.config ?? getBillingConfig();
  const client = input.client ?? prisma;
  const createCustomer = input.createCustomer ?? createStripeCustomer;
  const context = await resolveMembershipContext(input.sessionUser, input.audience);

  if (!context.subjectId) {
    return {
      ok: false as const,
      reason: "subject-unavailable",
      context,
      customer: null,
    };
  }

  const existingCustomer = await client.billingCustomer.findUnique({
    where: {
      subjectId_provider: {
        subjectId: context.subjectId,
        provider: config.provider,
      },
    },
  });

  if (existingCustomer) {
    return {
      ok: true as const,
      reason: null,
      context,
      customer: existingCustomer,
    };
  }

  if (config.mode !== "configured" || !config.secretKey) {
    return {
      ok: false as const,
      reason: config.disabledReason ?? "billing-disabled",
      context,
      customer: null,
    };
  }

  const metadata = {
    subjectId: context.subjectId,
    audience: input.audience,
    sessionUserId: input.sessionUser.id,
  };
  const providerCustomer = await createCustomer({
    secretKey: config.secretKey,
    email: input.sessionUser.email,
    name: context.displayName,
    metadata,
  });
  const now = new Date();
  const customer = await client.billingCustomer.upsert({
    where: {
      subjectId_provider: {
        subjectId: context.subjectId,
        provider: config.provider,
      },
    },
    update: {
      providerCustomerId: providerCustomer.id,
      email: providerCustomer.email ?? input.sessionUser.email,
      name: providerCustomer.name ?? context.displayName,
      metadata,
      lastSyncedAt: now,
      updatedAt: now,
    },
    create: {
      id: randomUUID(),
      subjectId: context.subjectId,
      provider: config.provider,
      providerCustomerId: providerCustomer.id,
      email: providerCustomer.email ?? input.sessionUser.email,
      name: providerCustomer.name ?? context.displayName,
      metadata,
      lastSyncedAt: now,
    },
  });

  return {
    ok: true as const,
    reason: null,
    context,
    customer,
  };
}
