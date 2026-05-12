import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildOperatorBriefings } from "@/lib/adminBriefings";
import {
  ADMIN_OVERVIEW_UTILITIES,
  getAdminOverviewUtilityHref,
  normalizeAdminOverviewUtility,
} from "@/lib/adminOverview";
import { deriveBillingAdminMetrics } from "@/lib/billing";
import { buildOperatorAuditSummary } from "@/lib/operatorAudit";
import { BillingCheckoutStatus, BillingWebhookStatus, MembershipPlan, MembershipStatus } from "@prisma/client";

const { redirectMock, prismaMock, getSessionUserMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  prismaMock: {
    company: {
      count: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    product: {
      count: vi.fn(),
    },
    surveyModule: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    surveySection: {
      count: vi.fn(),
    },
    insight: {
      count: vi.fn(),
    },
    taxonomyBucket: {
      count: vi.fn(),
    },
    capabilityNode: {
      count: vi.fn(),
    },
    portal: {
      count: vi.fn(),
    },
    membershipSubscription: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    operatorAuditEvent: {
      findMany: vi.fn(),
    },
    billingCheckout: {
      findMany: vi.fn(),
    },
    billingWebhookEvent: {
      findMany: vi.fn(),
    },
  },
  getSessionUserMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: getSessionUserMock,
}));

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
}));

describe("admin control plane contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.company.count.mockResolvedValue(3);
    prismaMock.user.count.mockResolvedValue(5);
    prismaMock.product.count.mockResolvedValue(8);
    prismaMock.surveyModule.count.mockResolvedValue(5);
    prismaMock.surveySection.count.mockResolvedValue(10);
    prismaMock.insight.count.mockResolvedValue(6);
    prismaMock.taxonomyBucket.count.mockResolvedValue(7);
    prismaMock.capabilityNode.count.mockResolvedValue(9);
    prismaMock.portal.count.mockResolvedValue(4);
    prismaMock.membershipSubscription.count.mockResolvedValue(2);
    prismaMock.operatorAuditEvent.findMany.mockResolvedValue([]);
    prismaMock.membershipSubscription.findMany.mockResolvedValue([]);
    prismaMock.billingCheckout.findMany.mockResolvedValue([]);
    prismaMock.billingWebhookEvent.findMany.mockResolvedValue([]);
    prismaMock.surveyModule.findMany.mockResolvedValue([]);
  });

  it("builds live operator briefings from canonical module and audit state", () => {
    const briefings = buildOperatorBriefings({
      canonicalModules: [
        {
          key: "firm_alignment_operating_model_v1",
          title: "Operating Model",
          active: true,
          _count: {
            SurveyQuestion: 20,
            SurveySection: 4,
            SurveySubmission: 3,
          },
        },
      ],
      recentAuditCount: 2,
      latestSubmitStatus: "ok",
    });

    expect(briefings).toHaveLength(3);
    expect(briefings[0].summary).toMatch(/section-backed/);
    expect(briefings[1].summary).toMatch(/ok/);
    expect(briefings[2].summary).toMatch(/2 recent operator audit event/);
  });

  it("formats operator audit summaries deterministically", () => {
    expect(
      buildOperatorAuditSummary({
        action: "update",
        entityType: "module",
        entityLabel: "firm_alignment_operating_model_v1",
      })
    ).toBe("update module firm_alignment_operating_model_v1");
  });

  it("exposes grouped admin overview utilities and normalizes unknown selections", () => {
    expect(ADMIN_OVERVIEW_UTILITIES.map((item) => item.key)).toEqual([
      "overview",
      "operations",
      "runtime",
      "financials",
      "help",
    ]);
    expect(normalizeAdminOverviewUtility(undefined)).toBe("overview");
    expect(normalizeAdminOverviewUtility("unknown")).toBe("overview");
    expect(normalizeAdminOverviewUtility("financials")).toBe("financials");
    expect(getAdminOverviewUtilityHref("financials")).toBe("/admin?utility=financials");
  });

  it("derives honest empty and populated financial state from live telemetry", () => {
    const empty = deriveBillingAdminMetrics({
      subscriptions: [],
      checkouts: [],
      webhookEvents: [],
    });
    const populated = deriveBillingAdminMetrics({
      subscriptions: [
        { plan: MembershipPlan.PRO, status: MembershipStatus.ACTIVE, createdAt: new Date(), updatedAt: new Date() },
        { plan: MembershipPlan.ELITE, status: MembershipStatus.PAST_DUE, createdAt: new Date(), updatedAt: new Date() },
      ],
      checkouts: [
        { status: BillingCheckoutStatus.COMPLETED, requestedPlan: MembershipPlan.PRO, createdAt: new Date(), completedAt: new Date() },
      ],
      webhookEvents: [
        { status: BillingWebhookStatus.FAILED, receivedAt: new Date() },
      ],
    });

    expect(empty.activeMemberships).toBe(0);
    expect(empty.recentConversions).toBe(0);
    expect(empty.webhookFailures).toBe(0);
    expect(populated.activeMemberships).toBe(1);
    expect(populated.paymentFailures).toBe(1);
    expect(populated.recentConversions).toBe(1);
    expect(populated.webhookFailures).toBe(1);
  });

  it("redirects signed-out operators to the canonical admin sign-in path", async () => {
    getSessionUserMock.mockResolvedValue(null);
    const { requireAdminSession } = await import("@/lib/adminControlPlane");

    await expect(requireAdminSession()).rejects.toThrow("REDIRECT:/sign-in?view=admin&callbackUrl=%2Fadmin");
  });

  it("redirects authenticated non-admin users away before control-plane data loads", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "member-1",
      email: "member@firm.com",
      role: "MEMBER",
      companyId: "company-1",
    });
    const { getAdminOverviewData } = await import("@/lib/adminControlPlane");

    await expect(getAdminOverviewData()).rejects.toThrow("REDIRECT:/");
    expect(prismaMock.company.count).not.toHaveBeenCalled();
    expect(prismaMock.operatorAuditEvent.findMany).not.toHaveBeenCalled();
  });

  it("allows admin operators to load control-plane overview data", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "admin-1",
      email: "admin@pat.com",
      role: "ADMIN",
      companyId: null,
    });
    const { getAdminOverviewData } = await import("@/lib/adminControlPlane");

    const overview = await getAdminOverviewData();

    expect(overview.metrics.organizations).toBe(3);
    expect(prismaMock.company.count).toHaveBeenCalled();
    expect(prismaMock.surveyModule.findMany).toHaveBeenCalled();
  });
});
