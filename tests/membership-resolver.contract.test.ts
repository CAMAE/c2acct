import { describe, expect, it } from "vitest";
import type { MembershipSubscription } from "@prisma/client";
import {
  DEFAULT_FREE_MEMBERSHIP_PLAN,
  DEFAULT_FREE_MEMBERSHIP_STATUS,
  MEMBERSHIP_PLAN,
  MEMBERSHIP_STATUS,
  getMembershipPlanRank,
  getMembershipUpgradeHref,
  hasMembershipAccess,
  getVirtualFreeMembershipSnapshot,
  isMembershipSnapshotEntitled,
  isMembershipStatusEntitled,
  normalizeMembershipPlan,
  normalizeMembershipStatus,
  resolveLocalReviewCompatibilityMembership,
} from "@/lib/membership";

describe("membership resolver contracts", () => {
  it("normalizes missing or invalid plans to free", () => {
    expect(normalizeMembershipPlan(undefined)).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(normalizeMembershipPlan(null)).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(normalizeMembershipPlan("UNKNOWN")).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(normalizeMembershipPlan(MEMBERSHIP_PLAN.PRO)).toBe(MEMBERSHIP_PLAN.PRO);
  });

  it("normalizes missing or invalid statuses to active", () => {
    expect(normalizeMembershipStatus(undefined)).toBe(DEFAULT_FREE_MEMBERSHIP_STATUS);
    expect(normalizeMembershipStatus(null)).toBe(DEFAULT_FREE_MEMBERSHIP_STATUS);
    expect(normalizeMembershipStatus("UNKNOWN")).toBe(DEFAULT_FREE_MEMBERSHIP_STATUS);
    expect(normalizeMembershipStatus(MEMBERSHIP_STATUS.PENDING_CHECKOUT)).toBe(
      MEMBERSHIP_STATUS.PENDING_CHECKOUT
    );
    expect(normalizeMembershipStatus(MEMBERSHIP_STATUS.INCOMPLETE)).toBe(MEMBERSHIP_STATUS.INCOMPLETE);
    expect(normalizeMembershipStatus(MEMBERSHIP_STATUS.UNPAID)).toBe(MEMBERSHIP_STATUS.UNPAID);
    expect(normalizeMembershipStatus(MEMBERSHIP_STATUS.PAYMENT_ACTION_REQUIRED)).toBe(
      MEMBERSHIP_STATUS.PAYMENT_ACTION_REQUIRED
    );
  });

  it("treats only active or trialing provider-backed subscriptions as entitled", () => {
    const pendingStripeSubscription = {
      provider: "stripe",
      providerStatus: "checkout_session_created",
    } as MembershipSubscription;
    const activeStripeSubscription = {
      provider: "stripe",
      providerStatus: "active",
    } as MembershipSubscription;
    const operatorSubscription = {
      provider: "pat-operator",
      providerStatus: null,
    } as MembershipSubscription;

    expect(isMembershipStatusEntitled(MEMBERSHIP_STATUS.ACTIVE)).toBe(true);
    expect(isMembershipStatusEntitled(MEMBERSHIP_STATUS.PAST_DUE)).toBe(false);
    expect(isMembershipSnapshotEntitled({
      status: MEMBERSHIP_STATUS.ACTIVE,
      subscription: pendingStripeSubscription,
    })).toBe(false);
    expect(isMembershipSnapshotEntitled({
      status: MEMBERSHIP_STATUS.ACTIVE,
      subscription: activeStripeSubscription,
    })).toBe(true);
    expect(isMembershipSnapshotEntitled({
      status: MEMBERSHIP_STATUS.ACTIVE,
      subscription: operatorSubscription,
    })).toBe(true);
  });

  it("builds a virtual free snapshot for every audience", () => {
    const vendor = getVirtualFreeMembershipSnapshot({
      audience: "vendor",
      subjectId: null,
      displayName: "Vendor",
      compatibilityMode: "virtual-free",
    });
    const firm = getVirtualFreeMembershipSnapshot({
      audience: "firm",
      subjectId: "subject-firm",
      displayName: "Firm",
      compatibilityMode: "native",
    });
    const individual = getVirtualFreeMembershipSnapshot({
      audience: "individual",
      subjectId: null,
      displayName: "review.individual@pat.local",
      compatibilityMode: "virtual-free",
    });

    expect(vendor.plan).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(vendor.status).toBe(DEFAULT_FREE_MEMBERSHIP_STATUS);
    expect(vendor.checkoutHref).toBe("/vendor/membership/checkout");

    expect(firm.plan).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(firm.status).toBe(DEFAULT_FREE_MEMBERSHIP_STATUS);
    expect(firm.checkoutHref).toBe("/firm/membership/checkout");

    expect(individual.plan).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(individual.status).toBe(DEFAULT_FREE_MEMBERSHIP_STATUS);
    expect(individual.checkoutHref).toBe("/user/membership/checkout");
  });

  it("keeps the plan ranking and minimum-tier checks explicit", () => {
    expect(getMembershipPlanRank(MEMBERSHIP_PLAN.FREE)).toBeLessThan(getMembershipPlanRank(MEMBERSHIP_PLAN.PRO));
    expect(getMembershipPlanRank(MEMBERSHIP_PLAN.PRO)).toBeLessThan(getMembershipPlanRank(MEMBERSHIP_PLAN.ELITE));
    expect(hasMembershipAccess(MEMBERSHIP_PLAN.FREE, MEMBERSHIP_PLAN.PRO)).toBe(false);
    expect(hasMembershipAccess(MEMBERSHIP_PLAN.PRO, MEMBERSHIP_PLAN.PRO)).toBe(true);
    expect(hasMembershipAccess(MEMBERSHIP_PLAN.ELITE, MEMBERSHIP_PLAN.PRO)).toBe(true);
  });

  it("builds upgrade hrefs against the current paid tiers only", () => {
    expect(getMembershipUpgradeHref("vendor", MEMBERSHIP_PLAN.PRO)).toBe("/vendor/membership/checkout?plan=pro");
    expect(getMembershipUpgradeHref("firm", MEMBERSHIP_PLAN.ELITE)).toBe("/firm/membership/checkout?plan=elite");
    expect(getMembershipUpgradeHref("individual", MEMBERSHIP_PLAN.FREE)).toBe("/user/membership/checkout?plan=pro");
  });

  it("defines explicit local-review compatibility membership only for vendor and firm review identities", () => {
    const previousFlag = process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH;

    process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH = "1";

    try {
      expect(resolveLocalReviewCompatibilityMembership("vendor", "review.vendor@pat.local")).toEqual({
        audience: "vendor",
        plan: MEMBERSHIP_PLAN.PRO,
        status: MEMBERSHIP_STATUS.ACTIVE,
      });
      expect(resolveLocalReviewCompatibilityMembership("firm", "review.firm@pat.local")).toEqual({
        audience: "firm",
        plan: MEMBERSHIP_PLAN.PRO,
        status: MEMBERSHIP_STATUS.ACTIVE,
      });
      expect(resolveLocalReviewCompatibilityMembership("vendor", "review.firm@pat.local")).toBeNull();
      expect(resolveLocalReviewCompatibilityMembership("firm", "review.vendor@pat.local")).toBeNull();
      expect(resolveLocalReviewCompatibilityMembership("individual", "review.individual@pat.local")).toBeNull();
      expect(resolveLocalReviewCompatibilityMembership("firm", "review.admin@pat.local")).toBeNull();
    } finally {
      if (typeof previousFlag === "string") {
        process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH = previousFlag;
      } else {
        delete process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH;
      }
    }
  });
});
