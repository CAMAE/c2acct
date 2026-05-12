import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BillingCheckoutStatus,
  BillingWebhookStatus,
  MembershipPlan,
  MembershipStatus,
} from "@prisma/client";

const prismaMock = {
  membershipSubscription: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  billingProfile: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
  billingCheckout: {
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
  billingPaymentMethod: {
    upsert: vi.fn(),
    updateMany: vi.fn(),
  },
  billingInvoice: {
    upsert: vi.fn(),
    findMany: vi.fn(),
  },
  billingWebhookEvent: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  $transaction: vi.fn(async (operations: unknown[]) => Promise.all(operations as Promise<unknown>[])),
};

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

vi.mock("@/lib/membershipContext", () => ({
  resolveMembershipContext: vi.fn(async () => ({
    audience: "vendor",
    subjectId: "subject-vendor-1",
    displayName: "Vendor One",
    compatibilityMode: "native",
  })),
}));

describe("billing contracts", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.AUTH_URL = "http://127.0.0.1:3001";
    process.env.PAT_BILLING_STRIPE_SECRET_KEY = "sk_test_pat";
    process.env.PAT_BILLING_STRIPE_WEBHOOK_SECRET = "whsec_pat";
    process.env.PAT_BILLING_VENDOR_PRO_PRICE_ID = "price_vendor_pro";
    process.env.PAT_BILLING_VENDOR_ELITE_PRICE_ID = "price_vendor_elite";
    process.env.PAT_BILLING_STRIPE_ENABLED_METHODS = "card";
  });

  it("marks cards as live while bank and PayPal stay staged when only card is enabled", async () => {
    const { BILLING_METHOD_CHOICE, getBillingMethodOptions } = await import("@/lib/billing");

    const methods = getBillingMethodOptions({
      audience: "vendor",
      plan: MembershipPlan.PRO,
    });

    expect(methods.find((method) => method.key === BILLING_METHOD_CHOICE.CARD)?.live).toBe(true);
    expect(methods.find((method) => method.key === BILLING_METHOD_CHOICE.BANK_DEBIT)?.live).toBe(false);
    expect(methods.find((method) => method.key === BILLING_METHOD_CHOICE.PAYPAL)?.live).toBe(false);
    expect(methods.find((method) => method.key === BILLING_METHOD_CHOICE.INVOICE_CONTACT)?.live).toBe(false);
  });

  it("creates a provider-backed billing session and persists pending local state", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "cus_123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "cs_123",
          url: "https://checkout.stripe.test/session/cs_123",
          customer: "cus_123",
          subscription: "sub_123",
          expires_at: 1_700_000_000,
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    prismaMock.membershipSubscription.findUnique.mockResolvedValue(null);
    prismaMock.billingProfile.findUnique.mockResolvedValue(null);
    prismaMock.membershipSubscription.upsert.mockResolvedValue({
      id: "membership_1",
      subjectId: "subject-vendor-1",
      plan: MembershipPlan.FREE,
      status: MembershipStatus.PENDING_CHECKOUT,
      externalCustomerRef: "cus_123",
    });
    prismaMock.billingCheckout.create.mockResolvedValue({
      id: "checkout_1",
    });
    prismaMock.billingProfile.upsert.mockResolvedValue({ id: "profile_1" });
    prismaMock.billingCheckout.update.mockResolvedValue({ id: "checkout_1" });
    prismaMock.membershipSubscription.update.mockResolvedValue({ id: "membership_1" });

    const { createMembershipBillingSession } = await import("@/lib/billing");

    const result = await createMembershipBillingSession({
      sessionUser: {
        id: "user-1",
        email: "vendor@pat.local",
        role: "ADMIN",
        companyId: "company-1",
      } as never,
      audience: "vendor",
      billingInput: {
        plan: MembershipPlan.PRO,
        methodChoice: "CARD",
        contactName: "Pat Vendor",
        billingEmail: "billing@vendor.com",
        billingPhone: "555-111-2222",
        companyLegalName: "Vendor One LLC",
        taxId: "12-3456789",
        addressLine1: "100 Main St",
        addressLine2: "",
        city: "Chicago",
        region: "IL",
        postalCode: "60601",
        country: "US",
        consentToStoreMethod: true,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.redirectUrl).toContain("checkout.stripe.test");
    }
    expect(prismaMock.membershipSubscription.upsert).toHaveBeenCalled();
    expect(prismaMock.billingCheckout.create).toHaveBeenCalled();
    expect(prismaMock.billingProfile.upsert).toHaveBeenCalled();
  });

  it("verifies stripe webhook signatures", async () => {
    const { verifyStripeWebhookSignature } = await import("@/lib/billing");
    const rawBody = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
    const timestamp = Math.floor(Date.now() / 1000);
    const crypto = await import("crypto");
    const signature = crypto.createHmac("sha256", "whsec_pat").update(`${timestamp}.${rawBody}`).digest("hex");

    expect(
      verifyStripeWebhookSignature({
        rawBody,
        signatureHeader: `t=${timestamp},v1=${signature}`,
        secret: "whsec_pat",
      })
    ).toBe(true);
  });

  it("reconciles stripe subscription statuses into PAT membership statuses", async () => {
    const { deriveMembershipStatusFromStripeStatus } = await import("@/lib/billing");

    expect(deriveMembershipStatusFromStripeStatus("active")).toBe(MembershipStatus.ACTIVE);
    expect(deriveMembershipStatusFromStripeStatus("trialing")).toBe(MembershipStatus.TRIAL);
    expect(deriveMembershipStatusFromStripeStatus("past_due")).toBe(MembershipStatus.PAST_DUE);
    expect(deriveMembershipStatusFromStripeStatus("incomplete")).toBe(MembershipStatus.PENDING_CHECKOUT);
    expect(deriveMembershipStatusFromStripeStatus("canceled")).toBe(MembershipStatus.CANCELED);
  });

  it("treats duplicate webhook delivery as idempotent", async () => {
    prismaMock.billingWebhookEvent.findUnique.mockResolvedValue({
      id: "webhook_1",
      providerEventRef: "evt_duplicate",
    });

    const crypto = await import("crypto");
    const rawBody = JSON.stringify({ id: "evt_duplicate", type: "invoice.paid", created: Math.floor(Date.now() / 1000) });
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = crypto.createHmac("sha256", "whsec_pat").update(`${timestamp}.${rawBody}`).digest("hex");

    const { processStripeWebhook } = await import("@/lib/billing");
    const result = await processStripeWebhook({
      rawBody,
      signatureHeader: `t=${timestamp},v1=${signature}`,
    });

    expect(result.ok).toBe(true);
    expect(prismaMock.billingWebhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { providerEventRef: "evt_duplicate" },
        data: expect.objectContaining({
          status: BillingWebhookStatus.DUPLICATE,
        }),
      })
    );
  });

  it("derives finance metrics from subscriptions, checkouts, and webhook events", async () => {
    const { deriveBillingAdminMetrics } = await import("@/lib/billing");

    const metrics = deriveBillingAdminMetrics({
      subscriptions: [
        { plan: MembershipPlan.PRO, status: MembershipStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() },
        { plan: MembershipPlan.ELITE, status: MembershipStatus.PAST_DUE, createdAt: new Date(), updatedAt: new Date() },
        { plan: MembershipPlan.FREE, status: MembershipStatus.PENDING_CHECKOUT, createdAt: new Date(), updatedAt: new Date() },
      ],
      checkouts: [
        { status: BillingCheckoutStatus.COMPLETED, requestedPlan: MembershipPlan.PRO, createdAt: new Date(), completedAt: new Date() },
        { status: BillingCheckoutStatus.OPEN, requestedPlan: MembershipPlan.ELITE, createdAt: new Date(), completedAt: null },
      ],
      webhookEvents: [
        { status: BillingWebhookStatus.PROCESSED, receivedAt: new Date() },
        { status: BillingWebhookStatus.FAILED, receivedAt: new Date() },
      ],
    });

    expect(metrics.activeMemberships).toBe(1);
    expect(metrics.pendingCheckouts).toBe(1);
    expect(metrics.paymentFailures).toBe(1);
    expect(metrics.recentConversions).toBe(1);
    expect(metrics.webhookFailures).toBe(1);
    expect(metrics.planMix.pro).toBe(1);
    expect(metrics.planMix.elite).toBe(1);
  });

  it("describes pending and past-due billing page states honestly", async () => {
    const { getBillingPageState } = await import("@/lib/billing");

    const pending = getBillingPageState({
      audience: "vendor",
      plan: MembershipPlan.PRO,
      currentPlan: MembershipPlan.FREE,
      status: MembershipStatus.PENDING_CHECKOUT,
    });
    const pastDue = getBillingPageState({
      audience: "vendor",
      plan: MembershipPlan.PRO,
      currentPlan: MembershipPlan.PRO,
      status: MembershipStatus.PAST_DUE,
    });

    expect(pending.statusSummary).toMatch(/already in progress/i);
    expect(pastDue.statusSummary).toMatch(/past due/i);
  });
});
