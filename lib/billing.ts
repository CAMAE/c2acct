import { createHmac, timingSafeEqual, randomUUID } from "crypto";
import {
  BillingCheckoutStatus,
  BillingInvoiceStatus,
  BillingPaymentMethodType,
  BillingProvider,
  BillingWebhookStatus,
  MembershipPlan,
  MembershipStatus,
  type Prisma,
} from "@prisma/client";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { trackServerEvent } from "@/lib/analytics";
import { resolveMembershipContext, type MembershipAudience } from "@/lib/membershipContext";
import type { SessionUser } from "@/lib/auth/session";
import { getCommercialFeatureFlags, cleanProviderEnv } from "@/lib/commercialFlags";
import {
  DEFAULT_FREE_MEMBERSHIP_PLAN,
  normalizeMembershipPlan,
} from "@/lib/membership";
import { captureException } from "@/lib/sentry";
import {
  sendMembershipUpgradeConfirmationEmail,
  sendPaymentFailureNotificationEmail,
} from "@/lib/transactionalEmail";

export const BILLING_PROVIDER = {
  STRIPE: BillingProvider.STRIPE,
} as const;

export const BILLING_METHOD_CHOICE = {
  CARD: "CARD",
  BANK_DEBIT: "BANK_DEBIT",
  PAYPAL: "PAYPAL",
  INVOICE_CONTACT: "INVOICE_CONTACT",
} as const;

export type BillingMethodChoice = (typeof BILLING_METHOD_CHOICE)[keyof typeof BILLING_METHOD_CHOICE];

export const MembershipBillingInputSchema = z.object({
  plan: z.nativeEnum(MembershipPlan),
  methodChoice: z.enum([
    BILLING_METHOD_CHOICE.CARD,
    BILLING_METHOD_CHOICE.BANK_DEBIT,
    BILLING_METHOD_CHOICE.PAYPAL,
    BILLING_METHOD_CHOICE.INVOICE_CONTACT,
  ]),
  contactName: z.string().trim().min(2),
  billingEmail: z.string().trim().email(),
  billingPhone: z.string().trim().min(7).max(40),
  companyLegalName: z.string().trim().max(200).optional().default(""),
  taxId: z.string().trim().max(80).optional().default(""),
  addressLine1: z.string().trim().min(3),
  addressLine2: z.string().trim().max(200).optional().default(""),
  city: z.string().trim().min(2),
  region: z.string().trim().max(120).optional().default(""),
  postalCode: z.string().trim().min(2).max(20),
  country: z.string().trim().min(2).max(2),
  consentToStoreMethod: z.literal(true),
});

export type MembershipBillingInput = z.infer<typeof MembershipBillingInputSchema>;

export type BillingMethodOption = {
  key: BillingMethodChoice;
  label: string;
  description: string;
  live: boolean;
  stagedReason: string | null;
  providerPaymentMethodTypes: string[];
};

export type BillingConfiguration = {
  enabled: boolean;
  provider: BillingProvider;
  secretKey: string | null;
  webhookSecret: string | null;
  appBaseUrl: string | null;
  liveMethodKeys: BillingMethodChoice[];
  priceIds: Record<MembershipAudience, Partial<Record<MembershipPlan, string>>>;
};

export type BillingCreateSessionResult =
  | {
      ok: true;
      checkoutId: string;
      redirectUrl: string;
    }
  | {
      ok: false;
      reason:
        | "billing-not-configured"
        | "subject-unavailable"
        | "unsupported-plan"
        | "method-not-live"
        | "provider-error";
      message: string;
    };

type StripeCheckoutSession = {
  id: string;
  url: string | null;
  customer: string | null;
  subscription: string | null;
  expires_at?: number;
  metadata?: Record<string, string | undefined> | null;
};

type StripeSubscriptionLike = {
  id: string;
  customer: string | null;
  status: string;
  cancel_at_period_end?: boolean;
  canceled_at?: number | null;
  trial_end?: number | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  default_payment_method?: Record<string, unknown> | string | null;
  items?: {
    data?: Array<{
      price?: {
        id?: string | null;
      } | null;
    }>;
  } | null;
  metadata?: Record<string, string | undefined> | null;
  latest_invoice?: Record<string, unknown> | null;
};

type StripeInvoiceLike = {
  id: string;
  customer: string | null;
  subscription: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string | null;
  hosted_invoice_url?: string | null;
  invoice_pdf?: string | null;
  due_date?: number | null;
  status_transitions?: {
    paid_at?: number | null;
    voided_at?: number | null;
  } | null;
  period_start?: number | null;
  period_end?: number | null;
  payment_intent?: string | Record<string, unknown> | null;
  charge?: string | Record<string, unknown> | null;
  metadata?: Record<string, string | undefined> | null;
};

function getAppBaseUrl() {
  return cleanProviderEnv(process.env.AUTH_URL) ?? cleanProviderEnv(process.env.NEXTAUTH_URL) ?? "http://127.0.0.1:3001";
}

export function getBillingConfiguration(): BillingConfiguration {
  const flags = getCommercialFeatureFlags();
  const secretKey =
    cleanProviderEnv(process.env.PAT_BILLING_STRIPE_SECRET_KEY) ?? cleanProviderEnv(process.env.STRIPE_SECRET_KEY);
  const webhookSecret =
    cleanProviderEnv(process.env.PAT_BILLING_STRIPE_WEBHOOK_SECRET) ??
    cleanProviderEnv(process.env.STRIPE_WEBHOOK_SECRET);
  const rawMethods = cleanProviderEnv(process.env.PAT_BILLING_STRIPE_ENABLED_METHODS) ?? "card";
  const liveMethodKeys = rawMethods
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .flatMap((value) => {
      if (value === "card") {
        return [BILLING_METHOD_CHOICE.CARD];
      }

      if (value === "us_bank_account" || value === "bank_debit") {
        return flags.bankMethodsEnabled ? [BILLING_METHOD_CHOICE.BANK_DEBIT] : [];
      }

      return [];
    });

  return {
    enabled: flags.billingEnabled && Boolean(secretKey),
    provider: BILLING_PROVIDER.STRIPE,
    secretKey,
    webhookSecret,
    appBaseUrl: getAppBaseUrl(),
    liveMethodKeys,
    priceIds: {
      vendor: {
        [MembershipPlan.PRO]:
          cleanProviderEnv(process.env.PAT_BILLING_VENDOR_PRO_PRICE_ID) ??
          cleanProviderEnv(process.env.STRIPE_VENDOR_PRO_PRICE_ID) ??
          undefined,
        [MembershipPlan.ELITE]:
          cleanProviderEnv(process.env.PAT_BILLING_VENDOR_ELITE_PRICE_ID) ??
          cleanProviderEnv(process.env.STRIPE_VENDOR_ELITE_PRICE_ID) ??
          undefined,
      },
      firm: {
        [MembershipPlan.PRO]:
          cleanProviderEnv(process.env.PAT_BILLING_FIRM_PRO_PRICE_ID) ??
          cleanProviderEnv(process.env.STRIPE_FIRM_PRO_PRICE_ID) ??
          undefined,
        [MembershipPlan.ELITE]:
          cleanProviderEnv(process.env.PAT_BILLING_FIRM_ELITE_PRICE_ID) ??
          cleanProviderEnv(process.env.STRIPE_FIRM_ELITE_PRICE_ID) ??
          undefined,
      },
      individual: {
        [MembershipPlan.PRO]:
          cleanProviderEnv(process.env.PAT_BILLING_USER_PRO_PRICE_ID) ??
          cleanProviderEnv(process.env.STRIPE_USER_PRO_PRICE_ID) ??
          undefined,
        [MembershipPlan.ELITE]:
          cleanProviderEnv(process.env.PAT_BILLING_USER_ELITE_PRICE_ID) ??
          cleanProviderEnv(process.env.STRIPE_USER_ELITE_PRICE_ID) ??
          undefined,
      },
    },
  };
}

export function getBillingMethodOptions(input: {
  audience: MembershipAudience;
  plan: MembershipPlan;
  billingConfig?: BillingConfiguration;
}): BillingMethodOption[] {
  const config = input.billingConfig ?? getBillingConfiguration();
  const flags = getCommercialFeatureFlags();
  const priceId = config.priceIds[input.audience][input.plan];
  const cardLive = config.enabled && Boolean(priceId) && config.liveMethodKeys.includes(BILLING_METHOD_CHOICE.CARD);
  const bankDebitLive =
    config.enabled && Boolean(priceId) && config.liveMethodKeys.includes(BILLING_METHOD_CHOICE.BANK_DEBIT);

  return [
    {
      key: BILLING_METHOD_CHOICE.CARD,
      label: "Cards / wallets",
      description: cardLive
        ? "Live provider-backed checkout for cards and wallet-backed card methods. Credentials stay with the provider and can be reused for future upgrades."
        : "Card and wallet checkout stay staged until billing configuration is complete for this audience and plan.",
      live: cardLive,
      stagedReason: cardLive ? null : "Cards and wallets are not configured for this plan yet.",
      providerPaymentMethodTypes: ["card"],
    },
    {
      key: BILLING_METHOD_CHOICE.BANK_DEBIT,
      label: "Bank / ACH",
      description: bankDebitLive
        ? "Provider-backed bank or ACH debit checkout. Authorization and saved method storage stay with the provider."
        : "Visible for the rollout, but not enabled yet. PAT will not fake bank or ACH completion before the provider path is live.",
      live: bankDebitLive,
      stagedReason: bankDebitLive
        ? null
        : flags.bankMethodsEnabled
          ? "Bank or ACH checkout still needs a live provider method configuration."
          : "Bank or ACH checkout is staged for this rollout.",
      providerPaymentMethodTypes: ["us_bank_account"],
    },
    {
      key: BILLING_METHOD_CHOICE.PAYPAL,
      label: "PayPal",
      description: flags.paypalEnabled
        ? "PayPal is part of the visible billing roadmap, but PAT does not have a live provider-backed PayPal handoff in this environment yet."
        : "PayPal is visible as a staged option only. PAT does not fake a PayPal handoff before the provider path exists.",
      live: false,
      stagedReason: flags.paypalEnabled
        ? "PayPal is flagged on for rollout review, but no live provider handoff is wired yet."
        : "PayPal is staged and unavailable.",
      providerPaymentMethodTypes: [],
    },
    {
      key: BILLING_METHOD_CHOICE.INVOICE_CONTACT,
      label: "Billing help",
      description:
        "Visible for operators who need invoice-led onboarding or billing guidance, but not live in PAT yet. This does not create a fake manual billing workflow.",
      live: false,
      stagedReason: "Billing-help and invoice-led paths are staged.",
      providerPaymentMethodTypes: [],
    },
  ];
}

export function getConfiguredPriceId(
  audience: MembershipAudience,
  plan: MembershipPlan,
  billingConfig: BillingConfiguration = getBillingConfiguration()
) {
  return billingConfig.priceIds[audience][plan] ?? null;
}

export function getBillingPageState(input: {
  audience: MembershipAudience;
  plan: MembershipPlan;
  currentPlan: MembershipPlan;
  status: MembershipStatus;
}) {
  const config = getBillingConfiguration();
  const methods = getBillingMethodOptions({
    audience: input.audience,
    plan: input.plan,
    billingConfig: config,
  });

  return {
    providerEnabled: config.enabled,
    providerLabel: "Stripe-hosted payment processing",
    priceConfigured: Boolean(getConfiguredPriceId(input.audience, input.plan, config)),
    methods,
    canSubmit: methods.some((method) => method.live),
    statusSummary:
      input.status === MembershipStatus.PAST_DUE
        ? "Your membership is past due. Update the saved provider method or start a replacement payment-processing session."
        : input.status === MembershipStatus.PENDING_CHECKOUT
          ? "A provider-backed checkout is already in progress. Completing it or letting it expire will update the live state."
          : input.status === MembershipStatus.CANCELED
            ? "The membership is canceled. Starting payment processing again creates a fresh provider-backed subscription path."
            : input.currentPlan === input.plan
              ? "This is your current plan. You can still open payment processing to refresh billing details or saved method state."
              : `You are moving from ${input.currentPlan} to ${input.plan}.`,
  };
}

export function getConfiguredPriceSummary(
  audience: MembershipAudience,
  plan: MembershipPlan,
  billingConfig: BillingConfiguration = getBillingConfiguration()
) {
  const envKey = `PAT_BILLING_${audience.toUpperCase()}_${plan}_PRICE_SUMMARY`;
  const envSummary = cleanProviderEnv(process.env[envKey]);
  if (envSummary) {
    return envSummary;
  }

  const priceId = getConfiguredPriceId(audience, plan, billingConfig);
  if (priceId) {
    return `Provider-backed recurring price configured in Stripe (${priceId}). The exact amount and taxes are confirmed again on the hosted checkout page.`;
  }

  return "No live provider price is configured for this plan yet. PAT will not fake a billable amount.";
}

function buildStripeFormBody(input: Record<string, string | number | boolean | null | undefined>) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    body.append(key, String(value));
  }

  return body;
}

async function stripeRequest<T>(input: {
  path: string;
  method?: "GET" | "POST";
  formBody?: URLSearchParams;
  query?: URLSearchParams;
}) {
  const config = getBillingConfiguration();
  if (!config.secretKey) {
    throw new Error("Stripe billing is not configured.");
  }

  const url = new URL(`https://api.stripe.com${input.path}`);
  if (input.query) {
    url.search = input.query.toString();
  }

  const response = await fetch(url.toString(), {
    method: input.method ?? "POST",
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      ...(input.formBody ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    body: input.formBody?.toString(),
    cache: "no-store",
  });

  const json = (await response.json()) as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(json.error?.message ?? `Stripe request failed for ${input.path}`);
  }

  return json;
}

function buildAudiencePath(audience: MembershipAudience) {
  return audience === "individual" ? "/user" : `/${audience}`;
}

function getMembershipStatusFromStripeStatus(status: string): MembershipStatus {
  switch (status) {
    case "trialing":
      return MembershipStatus.TRIAL;
    case "past_due":
    case "unpaid":
      return MembershipStatus.PAST_DUE;
    case "canceled":
    case "incomplete_expired":
      return MembershipStatus.CANCELED;
    case "incomplete":
      return MembershipStatus.PENDING_CHECKOUT;
    default:
      return MembershipStatus.ACTIVE;
  }
}

export function deriveMembershipStatusFromStripeStatus(status: string) {
  return getMembershipStatusFromStripeStatus(status);
}

function timestampToDate(value: number | null | undefined) {
  return typeof value === "number" ? new Date(value * 1000) : null;
}

function getPricePlanFromStripeRefs(input: {
  audience: MembershipAudience;
  priceRef: string | null | undefined;
  requestedPlan: MembershipPlan | null | undefined;
}) {
  if (input.priceRef) {
    const config = getBillingConfiguration();
    for (const plan of [MembershipPlan.PRO, MembershipPlan.ELITE] as const) {
      if (config.priceIds[input.audience][plan] === input.priceRef) {
        return plan;
      }
    }
  }

  return normalizeMembershipPlan(input.requestedPlan);
}

function buildPaymentMethodLabel(paymentMethod: Record<string, unknown>) {
  const type = typeof paymentMethod.type === "string" ? paymentMethod.type : null;

  if (type === "card") {
    const card = paymentMethod.card as Record<string, unknown> | undefined;
    const brand = typeof card?.brand === "string" ? card.brand.toUpperCase() : "Card";
    const last4 = typeof card?.last4 === "string" ? card.last4 : "xxxx";
    return `${brand} ending in ${last4}`;
  }

  if (type === "us_bank_account") {
    const bank = paymentMethod.us_bank_account as Record<string, unknown> | undefined;
    const bankName = typeof bank?.bank_name === "string" ? bank.bank_name : "Bank account";
    const last4 = typeof bank?.last4 === "string" ? bank.last4 : "xxxx";
    return `${bankName} ending in ${last4}`;
  }

  return "Saved provider payment method";
}

function getBillingPaymentMethodType(paymentMethod: Record<string, unknown>): BillingPaymentMethodType {
  return paymentMethod.type === "us_bank_account"
    ? BillingPaymentMethodType.US_BANK_ACCOUNT
    : BillingPaymentMethodType.CARD;
}

async function upsertStripeCustomer(input: {
  existingCustomerRef: string | null;
  billingInput: MembershipBillingInput;
  subjectId: string;
  audience: MembershipAudience;
}) {
  const metadata: Record<string, string> = {
    pat_subject_id: input.subjectId,
    pat_audience: input.audience,
  };
  const formBody = buildStripeFormBody({
    name: input.billingInput.contactName,
    email: input.billingInput.billingEmail,
    phone: input.billingInput.billingPhone,
    "address[line1]": input.billingInput.addressLine1,
    "address[line2]": input.billingInput.addressLine2,
    "address[city]": input.billingInput.city,
    "address[state]": input.billingInput.region,
    "address[postal_code]": input.billingInput.postalCode,
    "address[country]": input.billingInput.country,
    "metadata[pat_subject_id]": metadata.pat_subject_id,
    "metadata[pat_audience]": metadata.pat_audience,
    "metadata[pat_company_legal_name]": input.billingInput.companyLegalName,
    "metadata[pat_tax_id]": input.billingInput.taxId,
  });

  if (input.existingCustomerRef) {
    const customer = await stripeRequest<{ id: string }>({
      path: `/v1/customers/${input.existingCustomerRef}`,
      formBody,
    });

    return customer.id;
  }

  const customer = await stripeRequest<{ id: string }>({
    path: "/v1/customers",
    formBody,
  });

  return customer.id;
}

export async function createMembershipBillingSession(input: {
  sessionUser: SessionUser;
  audience: MembershipAudience;
  billingInput: MembershipBillingInput;
}) : Promise<BillingCreateSessionResult> {
  const config = getBillingConfiguration();
  if (!config.enabled || !config.appBaseUrl) {
    return {
      ok: false,
      reason: "billing-not-configured",
      message: "Live billing is not configured yet. PAT will not fake a payment completion path.",
    };
  }

  const context = await resolveMembershipContext(input.sessionUser, input.audience);
  if (!context.subjectId) {
    return {
      ok: false,
      reason: "subject-unavailable",
      message: "PAT cannot start billing until the membership subject is available for this account.",
    };
  }

  const requestedPlan = normalizeMembershipPlan(input.billingInput.plan);
  const priceId = getConfiguredPriceId(input.audience, requestedPlan, config);
  if (!priceId || requestedPlan === MembershipPlan.FREE) {
    return {
      ok: false,
      reason: "unsupported-plan",
      message: "This plan is not configured for provider-backed billing yet.",
    };
  }

  const method = getBillingMethodOptions({
    audience: input.audience,
    plan: requestedPlan,
    billingConfig: config,
  }).find((option) => option.key === input.billingInput.methodChoice);

  if (!method?.live) {
    return {
      ok: false,
      reason: "method-not-live",
      message: method?.stagedReason ?? "This payment method is staged and not live yet.",
    };
  }

  try {
    const currentSubscription = await prisma.membershipSubscription.findUnique({
      where: { subjectId: context.subjectId },
    });
    const currentProfile = await prisma.billingProfile.findUnique({
      where: { subjectId: context.subjectId },
    });

    const customerRef = await upsertStripeCustomer({
      existingCustomerRef: currentProfile?.externalCustomerRef ?? currentSubscription?.externalCustomerRef ?? null,
      billingInput: input.billingInput,
      subjectId: context.subjectId,
      audience: input.audience,
    });

    const subscription = await prisma.membershipSubscription.upsert({
      where: { subjectId: context.subjectId },
      update: {
        provider: BILLING_PROVIDER.STRIPE,
        status: MembershipStatus.PENDING_CHECKOUT,
        checkoutRequestedPlan: requestedPlan,
        externalCustomerRef: customerRef,
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        subjectId: context.subjectId,
        plan: currentSubscription?.plan ?? DEFAULT_FREE_MEMBERSHIP_PLAN,
        status: MembershipStatus.PENDING_CHECKOUT,
        provider: BILLING_PROVIDER.STRIPE,
        externalCustomerRef: customerRef,
        checkoutRequestedPlan: requestedPlan,
        startedAt: new Date(),
      },
    });

    const checkout = await prisma.billingCheckout.create({
      data: {
        id: randomUUID(),
        subjectId: context.subjectId,
        subscriptionId: subscription.id,
        provider: BILLING_PROVIDER.STRIPE,
        requestedPlan,
        currentPlan: currentSubscription?.plan ?? DEFAULT_FREE_MEMBERSHIP_PLAN,
        status: BillingCheckoutStatus.OPEN,
        paymentMethodChoice: input.billingInput.methodChoice,
        providerCustomerRef: customerRef,
        enabledPaymentMethodTypes: method.providerPaymentMethodTypes,
        billingProfileSnapshot: input.billingInput as unknown as Prisma.InputJsonValue,
        metadata: {
          audience: input.audience,
          subjectKey: context.subjectId,
        },
      },
    });

    await prisma.billingProfile.upsert({
      where: { subjectId: context.subjectId },
      update: {
        provider: BILLING_PROVIDER.STRIPE,
        externalCustomerRef: customerRef,
        contactName: input.billingInput.contactName,
        billingEmail: input.billingInput.billingEmail,
        billingPhone: input.billingInput.billingPhone,
        companyLegalName: input.billingInput.companyLegalName || null,
        taxId: input.billingInput.taxId || null,
        addressLine1: input.billingInput.addressLine1,
        addressLine2: input.billingInput.addressLine2 || null,
        city: input.billingInput.city,
        region: input.billingInput.region || null,
        postalCode: input.billingInput.postalCode,
        country: input.billingInput.country.toUpperCase(),
        consentToStoreMethod: true,
        consentAcceptedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        id: randomUUID(),
        subjectId: context.subjectId,
        provider: BILLING_PROVIDER.STRIPE,
        externalCustomerRef: customerRef,
        contactName: input.billingInput.contactName,
        billingEmail: input.billingInput.billingEmail,
        billingPhone: input.billingInput.billingPhone,
        companyLegalName: input.billingInput.companyLegalName || null,
        taxId: input.billingInput.taxId || null,
        addressLine1: input.billingInput.addressLine1,
        addressLine2: input.billingInput.addressLine2 || null,
        city: input.billingInput.city,
        region: input.billingInput.region || null,
        postalCode: input.billingInput.postalCode,
        country: input.billingInput.country.toUpperCase(),
        consentToStoreMethod: true,
        consentAcceptedAt: new Date(),
      },
    });

    const basePath = buildAudiencePath(input.audience);
    const successUrl = `${config.appBaseUrl}${basePath}/membership?checkout=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${config.appBaseUrl}${basePath}/membership/payment-processing?plan=${requestedPlan.toLowerCase()}&state=canceled`;
    const sessionBody = buildStripeFormBody({
      mode: "subscription",
      customer: customerRef,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      "payment_method_types[0]": method.providerPaymentMethodTypes[0],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: context.subjectId,
      billing_address_collection: "required",
      "subscription_data[metadata][pat_subject_id]": context.subjectId,
      "subscription_data[metadata][pat_audience]": input.audience,
      "subscription_data[metadata][pat_requested_plan]": requestedPlan,
      "subscription_data[metadata][pat_checkout_id]": checkout.id,
      "metadata[pat_subject_id]": context.subjectId,
      "metadata[pat_audience]": input.audience,
      "metadata[pat_requested_plan]": requestedPlan,
      "metadata[pat_checkout_id]": checkout.id,
      "metadata[pat_subscription_id]": subscription.id,
      "customer_update[name]": "auto",
      "customer_update[address]": "auto",
    });
    if (input.billingInput.billingEmail) {
      sessionBody.append("customer_email", input.billingInput.billingEmail);
    }

    const stripeSession = await stripeRequest<StripeCheckoutSession>({
      path: "/v1/checkout/sessions",
      formBody: sessionBody,
    });

    if (!stripeSession.url) {
      throw new Error("Stripe checkout session did not return a redirect URL.");
    }

    await prisma.$transaction([
      prisma.billingCheckout.update({
        where: { id: checkout.id },
        data: {
          providerCheckoutSessionRef: stripeSession.id,
          providerSubscriptionRef: stripeSession.subscription,
          successUrl,
          cancelUrl,
          expiresAt: timestampToDate(stripeSession.expires_at) ?? undefined,
        },
      }),
      prisma.membershipSubscription.update({
        where: { id: subscription.id },
        data: {
          checkoutSessionRef: stripeSession.id,
        },
      }),
    ]);

    await trackServerEvent({
      distinctId: context.subjectId,
      event: "checkout_started",
      properties: {
        audience: input.audience,
        requestedPlan,
        methodChoice: input.billingInput.methodChoice,
      },
    });

    return {
      ok: true,
      checkoutId: checkout.id,
      redirectUrl: stripeSession.url,
    };
  } catch (error) {
    await captureException(error, {
      source: "createMembershipBillingSession",
      audience: input.audience,
      plan: input.billingInput.plan,
      methodChoice: input.billingInput.methodChoice,
    });
    return {
      ok: false,
      reason: "provider-error",
      message: error instanceof Error ? error.message : "Provider-backed checkout creation failed.",
    };
  }
}

async function fetchStripeSubscription(subscriptionRef: string) {
  const query = new URLSearchParams();
  query.append("expand[]", "default_payment_method");
  query.append("expand[]", "latest_invoice.payment_intent");
  query.append("expand[]", "latest_invoice.charge");
  return stripeRequest<StripeSubscriptionLike>({
    path: `/v1/subscriptions/${subscriptionRef}`,
    method: "GET",
    query,
  });
}

async function fetchStripeInvoice(invoiceRef: string) {
  const query = new URLSearchParams();
  query.append("expand[]", "charge");
  query.append("expand[]", "payment_intent");
  return stripeRequest<StripeInvoiceLike>({
    path: `/v1/invoices/${invoiceRef}`,
    method: "GET",
    query,
  });
}

async function updatePaymentMethodSnapshot(input: {
  subjectId: string;
  customerRef: string | null;
  paymentMethod: Record<string, unknown> | null;
}) {
  if (!input.paymentMethod || typeof input.paymentMethod.id !== "string") {
    return;
  }

  await prisma.billingPaymentMethod.upsert({
    where: { providerPaymentMethodRef: input.paymentMethod.id },
    update: {
      externalCustomerRef: input.customerRef,
      type: getBillingPaymentMethodType(input.paymentMethod),
      brand:
        input.paymentMethod.type === "card"
          ? ((input.paymentMethod.card as Record<string, unknown> | undefined)?.brand as string | undefined) ?? null
          : null,
      last4:
        input.paymentMethod.type === "card"
          ? ((input.paymentMethod.card as Record<string, unknown> | undefined)?.last4 as string | undefined) ?? null
          : ((input.paymentMethod.us_bank_account as Record<string, unknown> | undefined)?.last4 as string | undefined) ?? null,
      bankName:
        input.paymentMethod.type === "us_bank_account"
          ? ((input.paymentMethod.us_bank_account as Record<string, unknown> | undefined)?.bank_name as string | undefined) ?? null
          : null,
      expMonth:
        input.paymentMethod.type === "card"
          ? (((input.paymentMethod.card as Record<string, unknown> | undefined)?.exp_month as number | undefined) ?? null)
          : null,
      expYear:
        input.paymentMethod.type === "card"
          ? (((input.paymentMethod.card as Record<string, unknown> | undefined)?.exp_year as number | undefined) ?? null)
          : null,
      reusable: true,
      isDefault: true,
      status: typeof input.paymentMethod.type === "string" ? input.paymentMethod.type : null,
      metadata: input.paymentMethod as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      subjectId: input.subjectId,
      provider: BillingProvider.STRIPE,
      externalCustomerRef: input.customerRef,
      providerPaymentMethodRef: input.paymentMethod.id,
      type: getBillingPaymentMethodType(input.paymentMethod),
      brand:
        input.paymentMethod.type === "card"
          ? ((input.paymentMethod.card as Record<string, unknown> | undefined)?.brand as string | undefined) ?? null
          : null,
      last4:
        input.paymentMethod.type === "card"
          ? ((input.paymentMethod.card as Record<string, unknown> | undefined)?.last4 as string | undefined) ?? null
          : ((input.paymentMethod.us_bank_account as Record<string, unknown> | undefined)?.last4 as string | undefined) ?? null,
      bankName:
        input.paymentMethod.type === "us_bank_account"
          ? ((input.paymentMethod.us_bank_account as Record<string, unknown> | undefined)?.bank_name as string | undefined) ?? null
          : null,
      expMonth:
        input.paymentMethod.type === "card"
          ? (((input.paymentMethod.card as Record<string, unknown> | undefined)?.exp_month as number | undefined) ?? null)
          : null,
      expYear:
        input.paymentMethod.type === "card"
          ? (((input.paymentMethod.card as Record<string, unknown> | undefined)?.exp_year as number | undefined) ?? null)
          : null,
      reusable: true,
      isDefault: true,
      status: typeof input.paymentMethod.type === "string" ? input.paymentMethod.type : null,
      metadata: input.paymentMethod as Prisma.InputJsonValue,
    },
  });

  await prisma.billingPaymentMethod.updateMany({
    where: {
      subjectId: input.subjectId,
      NOT: {
        providerPaymentMethodRef: input.paymentMethod.id,
      },
    },
    data: {
      isDefault: false,
    },
  });

  await prisma.billingProfile.updateMany({
    where: { subjectId: input.subjectId },
    data: {
      defaultPaymentMethodRef: input.paymentMethod.id,
      defaultPaymentMethodType: getBillingPaymentMethodType(input.paymentMethod),
      defaultPaymentMethodLabel: buildPaymentMethodLabel(input.paymentMethod),
      updatedAt: new Date(),
    },
  });
}

async function reconcileMembershipFromStripeSubscription(input: {
  subjectId: string;
  audience: MembershipAudience;
  subscriptionRef: string;
}) {
  const stripeSubscription = await fetchStripeSubscription(input.subscriptionRef);
  const priceRef = stripeSubscription.items?.data?.[0]?.price?.id ?? null;
  const requestedPlan = stripeSubscription.metadata?.pat_requested_plan
    ? (stripeSubscription.metadata.pat_requested_plan as MembershipPlan)
    : null;
  const resolvedPlan = getPricePlanFromStripeRefs({
    audience: input.audience,
    priceRef,
    requestedPlan,
  });
  const defaultPaymentMethod =
    stripeSubscription.default_payment_method && typeof stripeSubscription.default_payment_method === "object"
      ? stripeSubscription.default_payment_method
      : null;

  const subscription = await prisma.membershipSubscription.upsert({
    where: { subjectId: input.subjectId },
    update: {
      plan: resolvedPlan,
      status: getMembershipStatusFromStripeStatus(stripeSubscription.status),
      provider: BillingProvider.STRIPE,
      externalCustomerRef: stripeSubscription.customer,
      externalSubscriptionRef: stripeSubscription.id,
      externalPriceRef: priceRef,
      defaultPaymentMethodRef:
        defaultPaymentMethod && typeof defaultPaymentMethod.id === "string" ? defaultPaymentMethod.id : null,
      checkoutRequestedPlan: null,
      currentPeriodStart: timestampToDate(stripeSubscription.current_period_start) ?? undefined,
      currentPeriodEnd: timestampToDate(stripeSubscription.current_period_end) ?? undefined,
      trialEndsAt: timestampToDate(stripeSubscription.trial_end) ?? undefined,
      canceledAt: timestampToDate(stripeSubscription.canceled_at) ?? undefined,
      startedAt: timestampToDate(stripeSubscription.current_period_start) ?? new Date(),
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      subjectId: input.subjectId,
      plan: resolvedPlan,
      status: getMembershipStatusFromStripeStatus(stripeSubscription.status),
      provider: BillingProvider.STRIPE,
      externalCustomerRef: stripeSubscription.customer,
      externalSubscriptionRef: stripeSubscription.id,
      externalPriceRef: priceRef,
      defaultPaymentMethodRef:
        defaultPaymentMethod && typeof defaultPaymentMethod.id === "string" ? defaultPaymentMethod.id : null,
      startedAt: timestampToDate(stripeSubscription.current_period_start) ?? new Date(),
      trialEndsAt: timestampToDate(stripeSubscription.trial_end) ?? undefined,
      currentPeriodStart: timestampToDate(stripeSubscription.current_period_start) ?? undefined,
      currentPeriodEnd: timestampToDate(stripeSubscription.current_period_end) ?? undefined,
      canceledAt: timestampToDate(stripeSubscription.canceled_at) ?? undefined,
    },
  });

  await updatePaymentMethodSnapshot({
    subjectId: input.subjectId,
    customerRef: stripeSubscription.customer,
    paymentMethod: defaultPaymentMethod as Record<string, unknown> | null,
  });

  return {
    subscription,
    stripeSubscription,
  };
}

async function reconcileInvoiceFromStripe(input: {
  subjectId: string;
  subscriptionId: string | null;
  invoiceRef: string;
}) {
  const invoice = await fetchStripeInvoice(input.invoiceRef);
  const charge =
    invoice.charge && typeof invoice.charge === "object" ? (invoice.charge as Record<string, unknown>) : null;
  await prisma.billingInvoice.upsert({
    where: { providerInvoiceRef: invoice.id },
    update: {
      subjectId: input.subjectId,
      subscriptionId: input.subscriptionId,
      provider: BillingProvider.STRIPE,
      providerPaymentIntentRef:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : ((invoice.payment_intent as Record<string, unknown> | null)?.id as string | undefined) ?? null,
      providerChargeRef:
        typeof invoice.charge === "string"
          ? invoice.charge
          : ((invoice.charge as Record<string, unknown> | null)?.id as string | undefined) ?? null,
      providerReceiptUrl: (charge?.receipt_url as string | undefined) ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
      currency: invoice.currency ?? "usd",
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      status: deriveBillingInvoiceStatus(invoice.status),
      dueAt: timestampToDate(invoice.due_date) ?? undefined,
      paidAt: timestampToDate(invoice.status_transitions?.paid_at) ?? undefined,
      periodStart: timestampToDate(invoice.period_start) ?? undefined,
      periodEnd: timestampToDate(invoice.period_end) ?? undefined,
      failureReason: invoice.status === "uncollectible" ? "Invoice became uncollectible at the provider." : null,
      metadata: invoice as Prisma.InputJsonValue,
      updatedAt: new Date(),
    },
    create: {
      id: randomUUID(),
      subjectId: input.subjectId,
      subscriptionId: input.subscriptionId,
      provider: BillingProvider.STRIPE,
      providerInvoiceRef: invoice.id,
      providerPaymentIntentRef:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : ((invoice.payment_intent as Record<string, unknown> | null)?.id as string | undefined) ?? null,
      providerChargeRef:
        typeof invoice.charge === "string"
          ? invoice.charge
          : ((invoice.charge as Record<string, unknown> | null)?.id as string | undefined) ?? null,
      providerReceiptUrl: (charge?.receipt_url as string | undefined) ?? null,
      hostedInvoiceUrl: invoice.hosted_invoice_url ?? null,
      invoicePdfUrl: invoice.invoice_pdf ?? null,
      currency: invoice.currency ?? "usd",
      amountDue: invoice.amount_due,
      amountPaid: invoice.amount_paid,
      amountRemaining: invoice.amount_remaining,
      status: deriveBillingInvoiceStatus(invoice.status),
      dueAt: timestampToDate(invoice.due_date) ?? undefined,
      paidAt: timestampToDate(invoice.status_transitions?.paid_at) ?? undefined,
      periodStart: timestampToDate(invoice.period_start) ?? undefined,
      periodEnd: timestampToDate(invoice.period_end) ?? undefined,
      failureReason: invoice.status === "uncollectible" ? "Invoice became uncollectible at the provider." : null,
      metadata: invoice as Prisma.InputJsonValue,
    },
  });
}

export function deriveBillingInvoiceStatus(status: string | null | undefined) {
  switch (status) {
    case "paid":
      return BillingInvoiceStatus.PAID;
    case "void":
      return BillingInvoiceStatus.VOID;
    case "uncollectible":
      return BillingInvoiceStatus.UNCOLLECTIBLE;
    case "open":
    case "draft":
      return BillingInvoiceStatus.OPEN;
    default:
      return BillingInvoiceStatus.FAILED;
  }
}

function getStripeEventTimestamp(payload: Record<string, unknown>) {
  return typeof payload.created === "number" ? new Date(payload.created * 1000) : null;
}

function parseStripeSignatureHeader(signatureHeader: string) {
  const pairs = signatureHeader.split(",").map((entry) => entry.trim());
  const values = new Map<string, string>();

  for (const pair of pairs) {
    const [key, value] = pair.split("=", 2);
    if (key && value) {
      values.set(key, value);
    }
  }

  return values;
}

export function verifyStripeWebhookSignature(input: {
  rawBody: string;
  signatureHeader: string;
  secret: string;
  toleranceSeconds?: number;
}) {
  const values = parseStripeSignatureHeader(input.signatureHeader);
  const timestamp = values.get("t");
  const signature = values.get("v1");
  if (!timestamp || !signature) {
    return false;
  }

  const expected = createHmac("sha256", input.secret)
    .update(`${timestamp}.${input.rawBody}`)
    .digest("hex");

  const actualBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return false;
  }

  const tolerance = input.toleranceSeconds ?? 300;
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  return Number.isFinite(ageSeconds) && ageSeconds <= tolerance;
}

function inferAudienceFromPayload(payload: Record<string, unknown>): MembershipAudience | null {
  const object = payload.data && typeof payload.data === "object"
    ? ((payload.data as Record<string, unknown>).object as Record<string, unknown> | undefined)
    : undefined;
  const metadata = object?.metadata as Record<string, string | undefined> | undefined;
  const value = metadata?.pat_audience;

  if (value === "vendor" || value === "firm" || value === "individual") {
    return value;
  }

  return null;
}

export async function processStripeWebhook(input: {
  rawBody: string;
  signatureHeader: string | null;
}) {
  const config = getBillingConfiguration();
  if (!config.webhookSecret) {
    return {
      ok: false as const,
      status: 503,
      message: "Stripe webhook secret is not configured.",
    };
  }

  if (!input.signatureHeader || !verifyStripeWebhookSignature({
    rawBody: input.rawBody,
    signatureHeader: input.signatureHeader,
    secret: config.webhookSecret,
  })) {
    return {
      ok: false as const,
      status: 400,
      message: "Invalid Stripe webhook signature.",
    };
  }

  const payload = JSON.parse(input.rawBody) as Record<string, unknown>;
  const eventId = typeof payload.id === "string" ? payload.id : null;
  const eventType = typeof payload.type === "string" ? payload.type : "unknown";
  if (!eventId) {
    return {
      ok: false as const,
      status: 400,
      message: "Webhook payload did not include an event id.",
    };
  }

  const existing = await prisma.billingWebhookEvent.findUnique({
    where: { providerEventRef: eventId },
  });
  if (existing) {
    await prisma.billingWebhookEvent.update({
      where: { providerEventRef: eventId },
      data: {
        status: BillingWebhookStatus.DUPLICATE,
        processedAt: new Date(),
      },
    });
    return {
      ok: true as const,
      status: 200,
      message: "Duplicate webhook ignored.",
    };
  }

  const object = payload.data && typeof payload.data === "object"
    ? ((payload.data as Record<string, unknown>).object as Record<string, unknown> | undefined)
    : undefined;
  const metadata = (object?.metadata as Record<string, string | undefined> | undefined) ?? {};
  const subjectId = metadata.pat_subject_id ?? null;
  const subscriptionId = metadata.pat_subscription_id ?? null;
  const checkoutId = metadata.pat_checkout_id ?? null;

  const eventRecord = await prisma.billingWebhookEvent.create({
    data: {
      id: randomUUID(),
      provider: BillingProvider.STRIPE,
      providerEventRef: eventId,
      eventType,
      livemode: payload.livemode === true,
      status: BillingWebhookStatus.RECEIVED,
      signatureHeader: input.signatureHeader,
      eventCreatedAt: getStripeEventTimestamp(payload) ?? undefined,
      payload: payload as Prisma.InputJsonValue,
      subjectId,
      subscriptionId,
      checkoutId,
    },
  });

  try {
    if (eventType === "checkout.session.completed") {
      const audience = inferAudienceFromPayload(payload);
      const providerSubscriptionRef = typeof object?.subscription === "string" ? object.subscription : null;
      const providerCheckoutSessionRef = typeof object?.id === "string" ? object.id : null;

      if (checkoutId) {
        await prisma.billingCheckout.updateMany({
          where: { id: checkoutId },
          data: {
            status: BillingCheckoutStatus.COMPLETED,
            completedAt: new Date(),
            providerCheckoutSessionRef,
            providerSubscriptionRef,
            latestWebhookEventRef: eventId,
          },
        });
      }

      if (subjectId && audience && providerSubscriptionRef) {
        const result = await reconcileMembershipFromStripeSubscription({
          subjectId,
          audience,
          subscriptionRef: providerSubscriptionRef,
        });

        await prisma.billingWebhookEvent.update({
          where: { id: eventRecord.id },
          data: {
            status: BillingWebhookStatus.PROCESSED,
            processedAt: new Date(),
            subscriptionId: result.subscription.id,
          },
        });

        const billingProfile = await prisma.billingProfile.findUnique({
          where: { subjectId },
          select: {
            billingEmail: true,
            contactName: true,
          },
        }).catch(() => null);

        await trackServerEvent({
          distinctId: subjectId,
          event: "checkout_completed",
          properties: {
            audience,
            plan: result.subscription.plan,
            status: result.subscription.status,
          },
        });

        if (billingProfile?.billingEmail) {
          await sendMembershipUpgradeConfirmationEmail({
            toEmail: billingProfile.billingEmail,
            audience,
            plan: result.subscription.plan,
            displayName: billingProfile.contactName ?? subjectId,
          });
        }
      }
    } else if (eventType === "checkout.session.expired") {
      if (checkoutId) {
        await prisma.billingCheckout.updateMany({
          where: { id: checkoutId },
          data: {
            status: BillingCheckoutStatus.EXPIRED,
            abandonedAt: new Date(),
            latestWebhookEventRef: eventId,
          },
        });
      }
      if (subjectId) {
        await prisma.membershipSubscription.updateMany({
          where: {
            subjectId,
            status: MembershipStatus.PENDING_CHECKOUT,
          },
          data: {
            status: MembershipStatus.ACTIVE,
            updatedAt: new Date(),
          },
        });
      }

      await prisma.billingWebhookEvent.update({
        where: { id: eventRecord.id },
        data: {
          status: BillingWebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    } else if (
      eventType === "customer.subscription.created" ||
      eventType === "customer.subscription.updated" ||
      eventType === "customer.subscription.deleted"
    ) {
      const providerSubscriptionRef = typeof object?.id === "string" ? object.id : null;
      const audience = inferAudienceFromPayload(payload);
      if (subjectId && providerSubscriptionRef && audience) {
        const result = await reconcileMembershipFromStripeSubscription({
          subjectId,
          audience,
          subscriptionRef: providerSubscriptionRef,
        });

        await prisma.billingWebhookEvent.update({
          where: { id: eventRecord.id },
          data: {
            status: BillingWebhookStatus.PROCESSED,
            processedAt: new Date(),
            subscriptionId: result.subscription.id,
          },
        });
      }
    } else if (eventType === "invoice.paid" || eventType === "invoice.payment_failed") {
      const providerInvoiceRef = typeof object?.id === "string" ? object.id : null;
      if (subjectId && providerInvoiceRef) {
        const subscription = subjectId
          ? await prisma.membershipSubscription.findUnique({ where: { subjectId } })
          : null;
        await reconcileInvoiceFromStripe({
          subjectId,
          subscriptionId: subscription?.id ?? null,
          invoiceRef: providerInvoiceRef,
        });

        if (subscription?.id && eventType === "invoice.payment_failed") {
          await prisma.membershipSubscription.update({
            where: { id: subscription.id },
            data: {
              status: MembershipStatus.PAST_DUE,
              updatedAt: new Date(),
            },
          });

          const billingProfile = await prisma.billingProfile.findUnique({
            where: { subjectId },
            select: {
              billingEmail: true,
              contactName: true,
            },
          }).catch(() => null);

          await trackServerEvent({
            distinctId: subjectId,
            event: "payment_failed",
            properties: {
              subscriptionId: subscription.id,
              plan: subscription.plan,
            },
          });

          if (billingProfile?.billingEmail) {
            await sendPaymentFailureNotificationEmail({
              toEmail: billingProfile.billingEmail,
              audience: inferAudienceFromPayload(payload) ?? "vendor",
              plan: subscription.plan,
              displayName: billingProfile.contactName ?? subjectId,
            });
          }
        }

        await prisma.billingWebhookEvent.update({
          where: { id: eventRecord.id },
          data: {
            status: BillingWebhookStatus.PROCESSED,
            processedAt: new Date(),
            subscriptionId: subscription?.id ?? null,
          },
        });
      }
    } else {
      await prisma.billingWebhookEvent.update({
        where: { id: eventRecord.id },
        data: {
          status: BillingWebhookStatus.PROCESSED,
          processedAt: new Date(),
        },
      });
    }

    return {
      ok: true as const,
      status: 200,
      message: "Webhook processed.",
    };
  } catch (error) {
    await captureException(error, {
      source: "processStripeWebhook",
      eventType,
      subjectId,
      eventId,
    });
    await prisma.billingWebhookEvent.update({
      where: { id: eventRecord.id },
      data: {
        status: BillingWebhookStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : "Webhook processing failed.",
        processedAt: new Date(),
      },
    });
    return {
      ok: false as const,
      status: 500,
      message: error instanceof Error ? error.message : "Webhook processing failed.",
    };
  }
}

export async function buildMembershipBillingSummary(subjectId: string | null) {
  if (!subjectId) {
    return null;
  }

  const [profile, latestOpenCheckout] = await Promise.all([
    prisma.billingProfile.findUnique({
      where: { subjectId },
    }).catch(() => null),
    prisma.billingCheckout.findFirst({
      where: {
        subjectId,
        status: BillingCheckoutStatus.OPEN,
      },
      orderBy: { createdAt: "desc" },
    }).catch(() => null),
  ]);

  return {
    providerLabel: profile?.provider === BillingProvider.STRIPE ? "Stripe-managed billing" : "Billing not configured",
    billingEmail: profile?.billingEmail ?? null,
    defaultPaymentMethodLabel: profile?.defaultPaymentMethodLabel ?? null,
    paymentMethodType: profile?.defaultPaymentMethodType ?? null,
    pendingPlan: latestOpenCheckout?.requestedPlan ?? null,
    pendingCheckoutCreatedAt: latestOpenCheckout?.createdAt ?? null,
  };
}

export function deriveBillingAdminMetrics(input: {
  subscriptions: Array<{
    plan: MembershipPlan;
    status: MembershipStatus;
    updatedAt: Date;
    createdAt: Date;
  }>;
  checkouts: Array<{
    status: BillingCheckoutStatus;
    requestedPlan: MembershipPlan;
    createdAt: Date;
    completedAt: Date | null;
  }>;
  webhookEvents: Array<{
    status: BillingWebhookStatus;
    receivedAt: Date;
  }>;
}) {
  const activeMemberships = input.subscriptions.filter((item) => item.status === MembershipStatus.ACTIVE).length;
  const pendingCheckouts = input.subscriptions.filter((item) => item.status === MembershipStatus.PENDING_CHECKOUT).length;
  const paymentFailures = input.subscriptions.filter((item) => item.status === MembershipStatus.PAST_DUE).length;
  const webhookFailures = input.webhookEvents.filter((item) => item.status === BillingWebhookStatus.FAILED).length;
  const recentConversions = input.checkouts.filter((item) => item.status === BillingCheckoutStatus.COMPLETED).length;

  return {
    activeMemberships,
    pendingCheckouts,
    paymentFailures,
    webhookFailures,
    recentConversions,
    planMix: {
      free: input.subscriptions.filter((item) => item.plan === MembershipPlan.FREE).length,
      pro: input.subscriptions.filter((item) => item.plan === MembershipPlan.PRO).length,
      elite: input.subscriptions.filter((item) => item.plan === MembershipPlan.ELITE).length,
    },
  };
}
