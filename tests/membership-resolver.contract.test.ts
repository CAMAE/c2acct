import { describe, expect, it } from "vitest";
import type { MembershipSubscription } from "@prisma/client";
import {
  MEMBERSHIP_PLAN,
  MEMBERSHIP_STATUS,
  NO_MEMBERSHIP,
  getMembershipPlanRank,
  getMembershipUpgradeHref,
  hasMembershipAccess,
  getNoMembershipSnapshot,
  isMembershipSnapshotEntitled,
  isMembershipStatusEntitled,
  normalizeMembershipPlan,
  normalizeMembershipStatus,
  resolveLocalReviewCompatibilityMembership,
  toDbMembershipPlan,
} from "@/lib/membership";

describe("membership resolver contracts", () => {
  it("resolves missing, invalid, or FREE plans to NO_MEMBERSHIP — the resolver never returns FREE (B5-6)", () => {
    expect(normalizeMembershipPlan(undefined)).toBe(NO_MEMBERSHIP);
    expect(normalizeMembershipPlan(null)).toBe(NO_MEMBERSHIP);
    expect(normalizeMembershipPlan("UNKNOWN")).toBe(NO_MEMBERSHIP);
    expect(normalizeMembershipPlan(MEMBERSHIP_PLAN.FREE)).toBe(NO_MEMBERSHIP);
    expect(normalizeMembershipPlan(MEMBERSHIP_PLAN.PRO)).toBe(MEMBERSHIP_PLAN.PRO);
    expect(normalizeMembershipPlan(MEMBERSHIP_PLAN.ELITE)).toBe(MEMBERSHIP_PLAN.ELITE);
    // Structural guarantee: no input can ever coerce the resolver back to FREE.
    for (const input of [undefined, null, "", "FREE", "free", "UNKNOWN", "BASIC", MEMBERSHIP_PLAN.FREE]) {
      expect(normalizeMembershipPlan(input)).not.toBe(MEMBERSHIP_PLAN.FREE);
    }
  });

  it("maps NO_MEMBERSHIP back to a FREE DB placeholder only for subscription writes", () => {
    expect(toDbMembershipPlan(NO_MEMBERSHIP)).toBe(MEMBERSHIP_PLAN.FREE);
    expect(toDbMembershipPlan(undefined)).toBe(MEMBERSHIP_PLAN.FREE);
    expect(toDbMembershipPlan("UNKNOWN")).toBe(MEMBERSHIP_PLAN.FREE);
    expect(toDbMembershipPlan(MEMBERSHIP_PLAN.PRO)).toBe(MEMBERSHIP_PLAN.PRO);
    expect(toDbMembershipPlan(MEMBERSHIP_PLAN.ELITE)).toBe(MEMBERSHIP_PLAN.ELITE);
  });

  it("normalizes missing or invalid statuses to active", () => {
    expect(normalizeMembershipStatus(undefined)).toBe(MEMBERSHIP_STATUS.ACTIVE);
    expect(normalizeMembershipStatus(null)).toBe(MEMBERSHIP_STATUS.ACTIVE);
    expect(normalizeMembershipStatus("UNKNOWN")).toBe(MEMBERSHIP_STATUS.ACTIVE);
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

  it("builds an explicit no-membership snapshot for every audience (B5-6)", () => {
    const vendor = getNoMembershipSnapshot({
      audience: "vendor",
      subjectId: null,
      displayName: "Vendor",
      compatibilityMode: "no-membership",
    });
    const firm = getNoMembershipSnapshot({
      audience: "firm",
      subjectId: "subject-firm",
      displayName: "Firm",
      compatibilityMode: "native",
    });
    const individual = getNoMembershipSnapshot({
      audience: "individual",
      subjectId: null,
      displayName: "review.individual@pat.local",
      compatibilityMode: "no-membership",
    });

    for (const snapshot of [vendor, firm, individual]) {
      expect(snapshot.plan).toBe(NO_MEMBERSHIP);
      expect(snapshot.plan).not.toBe(MEMBERSHIP_PLAN.FREE);
      expect(snapshot.status).toBe(MEMBERSHIP_STATUS.CANCELED);
      expect(snapshot.source).toBe("no-membership");
    }
    expect(vendor.checkoutHref).toBe("/vendor/membership/checkout");
    expect(firm.checkoutHref).toBe("/firm/membership/checkout");
    expect(individual.checkoutHref).toBe("/user/membership/checkout");
  });

  it("ranks NO_MEMBERSHIP below every paid tier and denies access", () => {
    expect(getMembershipPlanRank(NO_MEMBERSHIP)).toBeLessThan(getMembershipPlanRank(MEMBERSHIP_PLAN.PRO));
    expect(hasMembershipAccess(NO_MEMBERSHIP, MEMBERSHIP_PLAN.PRO)).toBe(false);
    // An account with no resolvable plan (undefined) must not clear the PRO gate.
    expect(hasMembershipAccess(undefined, MEMBERSHIP_PLAN.PRO)).toBe(false);
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

  it("defines explicit local-review compatibility membership for vendor, firm, and individual review identities (Day-26 P0a)", () => {
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
      // Day-26 P0a (RK1): individual audience now returns PRO so the demo
      // walkthrough doesn't see locked Product Intelligence / alignment
      // insights on the individual surface. Previously fell through to
      // virtual-FREE.
      expect(resolveLocalReviewCompatibilityMembership("individual", "review.individual@pat.local")).toEqual({
        audience: "individual",
        plan: MEMBERSHIP_PLAN.PRO,
        status: MEMBERSHIP_STATUS.ACTIVE,
      });
      expect(resolveLocalReviewCompatibilityMembership("vendor", "review.firm@pat.local")).toBeNull();
      expect(resolveLocalReviewCompatibilityMembership("firm", "review.vendor@pat.local")).toBeNull();
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
