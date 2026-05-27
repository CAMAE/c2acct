import { beforeEach, describe, expect, it, vi } from "vitest";
import { MembershipStatus, UserRole } from "@prisma/client";
import type { BillingConfig } from "@/lib/billing/config";
import type { SessionUser } from "@/lib/auth/session";

const resolveMembershipContextMock = vi.hoisted(() => vi.fn());
const prismaMock = vi.hoisted(() => ({
  membershipSubscription: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
  },
  billingCustomer: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  billingWebhookEvent: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  billingInvoice: {
    upsert: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/membershipContext", async () => {
  const actual = await vi.importActual<typeof import("@/lib/membershipContext")>("@/lib/membershipContext");

  return {
    ...actual,
    resolveMembershipContext: resolveMembershipContextMock,
  };
});

import {
  getBillingConfig,
  getBillingModeForPlan,
} from "@/lib/billing/config";
import {
  processStripeWebhookEvent,
  reconcileStripeInvoice,
  mapStripeSubscriptionStatusToMembershipStatus,
} from "@/lib/billing/reconcile";
import { createMembershipCustomerPortalSession } from "@/lib/billing/portal";
import { startMembershipCheckoutFlow } from "@/lib/billing/checkout";
import {
  buildStripeCheckoutSessionParams,
  createStripeTestSignature,
  verifyStripeWebhookSignature,
} from "@/lib/billing/stripe";
import { MEMBERSHIP_PLAN, MEMBERSHIP_STATUS } from "@/lib/membership";
import {
  buildStripeEntitlementMatrix,
  buildStripeRoundtripFixtureEvents,
  proofContainsSensitiveBillingData,
} from "@/scripts/billing/stripe-roundtrip-proof";

const configuredBilling: BillingConfig = {
  mode: "configured",
  provider: "stripe",
  disabledReason: null,
  secretKey: "sk_test_pat",
  webhookSecret: "whsec_pat",
  appBaseUrl: "https://pat.example.test",
  prices: {
    vendor: {
      PRO: "price_vendor_pro",
      ELITE: "price_vendor_elite",
    },
    firm: {
      PRO: "price_firm_pro",
      ELITE: "price_firm_elite",
    },
    individual: {
      PRO: "price_individual_pro",
      ELITE: "price_individual_elite",
    },
  },
};

const sessionUser: SessionUser = {
  id: "user_1",
  email: "buyer@example.test",
  role: UserRole.MEMBER,
  companyId: "company_1",
};

function setupResolvedContext() {
  resolveMembershipContextMock.mockResolvedValue({
    audience: "vendor",
    subjectId: "subject_1",
    subjectKind: "ORGANIZATION",
    companyId: "company_1",
    companyType: "VENDOR",
    displayName: "Vendor Co",
    compatibilityMode: "native",
  });
}

describe("billing provider contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    setupResolvedContext();
  });

  it("keeps billing disabled unless env enables Stripe with a secret and plan price", () => {
    expect(getBillingConfig({} as NodeJS.ProcessEnv).mode).toBe("disabled");

    const config = getBillingConfig({
      PAT_BILLING_ENABLED: "1",
      STRIPE_SECRET_KEY: "sk_test_configured",
      STRIPE_PRICE_VENDOR_PRO: "price_vendor_pro",
    } as unknown as NodeJS.ProcessEnv);

    expect(config.mode).toBe("configured");
    expect(getBillingModeForPlan({
      config,
      audience: "vendor",
      plan: MEMBERSHIP_PLAN.PRO,
    })).toEqual({
      mode: "configured",
      reason: null,
      priceId: "price_vendor_pro",
    });
    expect(getBillingModeForPlan({
      config,
      audience: "firm",
      plan: MEMBERSHIP_PLAN.PRO,
    })).toEqual({
      mode: "disabled",
      reason: "missing_plan_price",
      priceId: null,
    });
  });

  it("creates Stripe checkout sessions with customer, price, redirect URLs, and subject metadata", async () => {
    prismaMock.billingCustomer.findUnique.mockResolvedValue(null);
    prismaMock.billingCustomer.upsert.mockResolvedValue({
      providerCustomerId: "cus_pat",
      subjectId: "subject_1",
      provider: "stripe",
    });
    prismaMock.membershipSubscription.findUnique.mockResolvedValue(null);
    prismaMock.membershipSubscription.upsert.mockResolvedValue({
      subjectId: "subject_1",
      plan: MEMBERSHIP_PLAN.FREE,
      status: MEMBERSHIP_STATUS.PENDING_CHECKOUT,
      provider: "stripe",
      checkoutSessionRef: "cs_pat",
    });
    const createCustomer = vi.fn().mockResolvedValue({
      id: "cus_pat",
      email: "buyer@example.test",
      name: "Vendor Co",
    });
    const createCheckoutSession = vi.fn().mockResolvedValue({
      id: "cs_pat",
      url: "https://checkout.stripe.test/session",
    });

    const result = await startMembershipCheckoutFlow({
      sessionUser,
      audience: "vendor",
      requestedPlan: MEMBERSHIP_PLAN.PRO,
      config: configuredBilling,
      createCustomer,
      createCheckoutSession,
    });

    expect(result.ok).toBe(true);
    expect(result.mode).toBe("provider");
    expect(result.redirectUrl).toBe("https://checkout.stripe.test/session");
    expect(createCustomer).toHaveBeenCalledWith(expect.objectContaining({
      email: "buyer@example.test",
      metadata: expect.objectContaining({
        subjectId: "subject_1",
        audience: "vendor",
      }),
    }));
    expect(createCheckoutSession).toHaveBeenCalledWith(expect.objectContaining({
      customerId: "cus_pat",
      priceId: "price_vendor_pro",
      successUrl: "https://pat.example.test/vendor/membership?checkout=provider&plan=pro&session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://pat.example.test/vendor/membership/checkout?plan=pro&billing=cancelled",
      metadata: expect.objectContaining({
        subjectId: "subject_1",
        plan: MEMBERSHIP_PLAN.PRO,
      }),
    }));
    expect(prismaMock.membershipSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        status: MEMBERSHIP_STATUS.PENDING_CHECKOUT,
        provider: "stripe",
        providerPriceRef: "price_vendor_pro",
        checkoutSessionRef: "cs_pat",
        checkoutRequestedPlan: MEMBERSHIP_PLAN.PRO,
      }),
    }));
  });

  it("builds Stripe checkout params without local card data", () => {
    const params = buildStripeCheckoutSessionParams({
      customerId: "cus_pat",
      priceId: "price_vendor_pro",
      successUrl: "https://pat.example.test/success",
      cancelUrl: "https://pat.example.test/cancel",
      clientReferenceId: "subject_1",
      metadata: {
        subjectId: "subject_1",
        plan: MEMBERSHIP_PLAN.PRO,
      },
    });

    expect(params.get("mode")).toBe("subscription");
    expect(params.get("customer")).toBe("cus_pat");
    expect(params.get("line_items[0][price]")).toBe("price_vendor_pro");
    expect(params.get("metadata[subjectId]")).toBe("subject_1");
    expect(Array.from(params.keys()).some((key) => /card|cvc|number/i.test(key))).toBe(false);
  });

  it("creates customer portal sessions only for configured provider customers", async () => {
    prismaMock.billingCustomer.findUnique.mockResolvedValue({
      providerCustomerId: "cus_pat",
      subjectId: "subject_1",
      provider: "stripe",
    });
    const createPortalSession = vi.fn().mockResolvedValue({
      id: "bps_pat",
      url: "https://billing.stripe.test/session",
    });

    const result = await createMembershipCustomerPortalSession({
      sessionUser,
      audience: "vendor",
      returnPath: "/vendor/membership",
      config: configuredBilling,
      createPortalSession,
    });

    expect(result.ok).toBe(true);
    expect(result.redirectUrl).toBe("https://billing.stripe.test/session");
    expect(createPortalSession).toHaveBeenCalledWith({
      secretKey: "sk_test_pat",
      customerId: "cus_pat",
      returnUrl: "https://pat.example.test/vendor/membership",
    });
  });

  it("verifies Stripe webhook fixtures and rejects stale or invalid signatures", () => {
    const payload = JSON.stringify({ id: "evt_pat", type: "customer.subscription.updated" });
    const signature = createStripeTestSignature({
      payload,
      webhookSecret: "whsec_pat",
      timestamp: 100,
    });

    expect(verifyStripeWebhookSignature({
      payload,
      signatureHeader: signature,
      webhookSecret: "whsec_pat",
      nowSeconds: 100,
    })).toBe(true);
    expect(verifyStripeWebhookSignature({
      payload,
      signatureHeader: signature,
      webhookSecret: "wrong_secret",
      nowSeconds: 100,
    })).toBe(false);
    expect(verifyStripeWebhookSignature({
      payload,
      signatureHeader: signature,
      webhookSecret: "whsec_pat",
      nowSeconds: 1_000,
    })).toBe(false);
  });

  it("maps provider subscription statuses into membership status without treating dirty client params as truth", () => {
    expect(mapStripeSubscriptionStatusToMembershipStatus("active")).toBe(MembershipStatus.ACTIVE);
    expect(mapStripeSubscriptionStatusToMembershipStatus("trialing")).toBe(MembershipStatus.TRIAL);
    expect(mapStripeSubscriptionStatusToMembershipStatus("past_due")).toBe(MembershipStatus.PAST_DUE);
    expect(mapStripeSubscriptionStatusToMembershipStatus("canceled")).toBe(MembershipStatus.CANCELED);
    expect(mapStripeSubscriptionStatusToMembershipStatus("incomplete")).toBe(MembershipStatus.INCOMPLETE);
    expect(mapStripeSubscriptionStatusToMembershipStatus("unpaid")).toBe(MembershipStatus.UNPAID);
    expect(mapStripeSubscriptionStatusToMembershipStatus("payment_action_required")).toBe(
      MembershipStatus.PAYMENT_ACTION_REQUIRED
    );
  });

  it("persists webhook events idempotently and reconciles active subscriptions", async () => {
    prismaMock.billingWebhookEvent.findUnique.mockResolvedValue(null);
    prismaMock.billingWebhookEvent.create.mockResolvedValue({
      id: "billing_event_1",
      provider: "stripe",
      providerEventId: "evt_subscription",
      processedAt: null,
    });
    prismaMock.billingWebhookEvent.update.mockResolvedValue({});
    prismaMock.membershipSubscription.upsert.mockResolvedValue({
      subjectId: "subject_1",
      plan: MEMBERSHIP_PLAN.PRO,
      status: MEMBERSHIP_STATUS.ACTIVE,
      provider: "stripe",
    });

    const result = await processStripeWebhookEvent({
      config: configuredBilling,
      event: {
        id: "evt_subscription",
        type: "customer.subscription.updated",
        livemode: false,
        data: {
          object: {
            id: "sub_pat",
            customer: "cus_pat",
            status: "active",
            metadata: {
              subjectId: "subject_1",
              plan: MEMBERSHIP_PLAN.PRO,
            },
            items: {
              data: [{ price: { id: "price_vendor_pro" } }],
            },
          },
        },
      },
    });

    expect(result.ok).toBe(true);
    expect(result.processed).toBe(true);
    expect(prismaMock.membershipSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        plan: MEMBERSHIP_PLAN.PRO,
        status: MembershipStatus.ACTIVE,
        providerStatus: "active",
        externalSubscriptionRef: "sub_pat",
        lastWebhookEventId: "billing_event_1",
      }),
    }));

    vi.clearAllMocks();
    prismaMock.billingWebhookEvent.findUnique.mockResolvedValue({
      id: "billing_event_1",
      processedAt: new Date("2026-04-27T00:00:00Z"),
    });

    const duplicateResult = await processStripeWebhookEvent({
      config: configuredBilling,
      event: {
        id: "evt_subscription",
        type: "customer.subscription.updated",
        data: { object: {} },
      },
    });

    expect(duplicateResult.duplicate).toBe(true);
    expect(duplicateResult.processed).toBe(false);
    expect(prismaMock.membershipSubscription.upsert).not.toHaveBeenCalled();
  });

  it("reconciles invoice payment failures into non-entitled membership states", async () => {
    prismaMock.membershipSubscription.findFirst.mockResolvedValue({ subjectId: "subject_1" });
    prismaMock.billingInvoice.upsert.mockResolvedValue({
      id: "invoice_row_1",
      providerInvoiceId: "in_pat",
      status: "open",
    });
    prismaMock.membershipSubscription.update.mockResolvedValue({});

    await reconcileStripeInvoice({
      eventType: "invoice.payment_failed",
      webhookEventId: "billing_event_2",
      invoice: {
        id: "in_pat",
        customer: "cus_pat",
        subscription: "sub_pat",
        status: "open",
        amount_due: 4900,
        amount_paid: 0,
        currency: "usd",
        last_payment_error: { message: "card declined" },
      },
    });

    expect(prismaMock.membershipSubscription.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { subjectId: "subject_1" },
      data: expect.objectContaining({
        status: MembershipStatus.PAST_DUE,
        providerStatus: "past_due",
        lastWebhookEventId: "billing_event_2",
      }),
    }));

    await reconcileStripeInvoice({
      eventType: "invoice.payment_action_required",
      webhookEventId: "billing_event_3",
      invoice: {
        id: "in_pat_action",
        customer: "cus_pat",
        subscription: "sub_pat",
        status: "open",
      },
    });

    expect(prismaMock.membershipSubscription.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: MembershipStatus.PAYMENT_ACTION_REQUIRED,
        providerStatus: "payment_action_required",
        lastWebhookEventId: "billing_event_3",
      }),
    }));
  });

  it("builds redacted Stripe roundtrip fixture events and keeps failed states non-entitled", () => {
    const entitlementMatrix = buildStripeEntitlementMatrix();

    expect(entitlementMatrix.active.entitled).toBe(true);
    expect(entitlementMatrix.trialing.entitled).toBe(true);
    expect(entitlementMatrix.past_due.entitled).toBe(false);
    expect(entitlementMatrix.canceled.entitled).toBe(false);
    expect(entitlementMatrix.incomplete.entitled).toBe(false);
    expect(entitlementMatrix.unpaid.entitled).toBe(false);
    expect(entitlementMatrix.payment_action_required.entitled).toBe(false);

    const fixtures = buildStripeRoundtripFixtureEvents({
      proofRunId: "fixtureproof",
      subjectId: "subject_1",
      customerId: "cus_fixture",
      subscriptionId: "sub_fixture",
      nowSeconds: 1_777_000_000,
    });
    const fixtureEnvelope = {
      mode: "fixture",
      redaction: {
        rawEventPayloadIncluded: false,
        rawCardOrBankDataIncluded: false,
        secretsIncluded: false,
      },
      entitlementMatrix,
      eventTypes: [
        fixtures.activeSubscription.type,
        fixtures.invoicePaid.type,
        fixtures.invoiceFailed.type,
        fixtures.invoiceActionRequired.type,
        ...fixtures.subscriptionStatuses.map((event) => event.type),
      ],
    };

    expect(fixtureEnvelope.eventTypes).toContain("invoice.paid");
    expect(fixtureEnvelope.eventTypes).toContain("invoice.payment_failed");
    expect(fixtureEnvelope.eventTypes).toContain("invoice.payment_action_required");
    expect(proofContainsSensitiveBillingData(fixtureEnvelope)).toBe(false);
  });
});
