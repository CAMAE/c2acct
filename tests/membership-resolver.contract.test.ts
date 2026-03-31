import { describe, expect, it } from "vitest";
import {
  DEFAULT_FREE_MEMBERSHIP_PLAN,
  DEFAULT_FREE_MEMBERSHIP_STATUS,
  MEMBERSHIP_PLAN,
  MEMBERSHIP_STATUS,
  getVirtualFreeMembershipSnapshot,
  normalizeMembershipPlan,
  normalizeMembershipStatus,
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
});
