import prisma from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth/session";
import {
  type BillingConfig,
  getBillingConfig,
} from "@/lib/billing/config";
import {
  createStripeCustomerPortalSession,
} from "@/lib/billing/stripe";
import type { MembershipAudience } from "@/lib/membershipContext";
import { resolveMembershipContext } from "@/lib/membershipContext";

type BillingPortalClient = typeof prisma;

export type StripePortalSessionCreator = typeof createStripeCustomerPortalSession;

function getAudiencePathPrefix(audience: MembershipAudience) {
  return audience === "individual" ? "/user" : `/${audience}`;
}

export async function createMembershipCustomerPortalSession(input: {
  sessionUser: SessionUser;
  audience: MembershipAudience;
  returnPath?: string;
  config?: BillingConfig;
  client?: BillingPortalClient;
  createPortalSession?: StripePortalSessionCreator;
}) {
  const config = input.config ?? getBillingConfig();
  const client = input.client ?? prisma;
  const context = await resolveMembershipContext(input.sessionUser, input.audience);
  const fallbackPath = `${getAudiencePathPrefix(input.audience)}/membership`;

  if (config.mode !== "configured" || !config.secretKey) {
    return {
      ok: false as const,
      mode: "scaffold" as const,
      provider: config.provider,
      reason: config.disabledReason ?? "billing-disabled",
      redirectUrl: null,
      returnPath: input.returnPath ?? fallbackPath,
    };
  }

  if (!context.subjectId) {
    return {
      ok: false as const,
      mode: "provider" as const,
      provider: config.provider,
      reason: "subject-unavailable",
      redirectUrl: null,
      returnPath: input.returnPath ?? fallbackPath,
    };
  }

  const customer = await client.billingCustomer.findUnique({
    where: {
      subjectId_provider: {
        subjectId: context.subjectId,
        provider: config.provider,
      },
    },
  });

  if (!customer) {
    return {
      ok: false as const,
      mode: "provider" as const,
      provider: config.provider,
      reason: "billing-customer-unavailable",
      redirectUrl: null,
      returnPath: input.returnPath ?? fallbackPath,
    };
  }

  const createPortalSession = input.createPortalSession ?? createStripeCustomerPortalSession;
  const returnPath = input.returnPath ?? fallbackPath;
  const session = await createPortalSession({
    secretKey: config.secretKey,
    customerId: customer.providerCustomerId,
    returnUrl: `${config.appBaseUrl}${returnPath}`,
  });

  return {
    ok: true as const,
    mode: "provider" as const,
    provider: config.provider,
    reason: null,
    redirectUrl: session.url,
    returnPath,
  };
}
