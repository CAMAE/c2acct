import { describe, expect, it } from "vitest";
import { DEFAULT_FREE_MEMBERSHIP_PLAN, MEMBERSHIP_PLAN } from "@/lib/membership";
import {
  buildMembershipCheckoutHref,
  getDefaultMembershipTab,
  getMembershipPageModel,
  getMembershipTabs,
  getRequestedCheckoutPlan,
} from "@/lib/membershipContent";

describe("membership page contracts", () => {
  it("defaults the active toggle to the current membership plan", () => {
    expect(getDefaultMembershipTab(MEMBERSHIP_PLAN.FREE)).toBe(MEMBERSHIP_PLAN.FREE);
    expect(getDefaultMembershipTab(MEMBERSHIP_PLAN.PRO)).toBe(MEMBERSHIP_PLAN.PRO);
    expect(getDefaultMembershipTab(MEMBERSHIP_PLAN.ELITE)).toBe(MEMBERSHIP_PLAN.ELITE);
  });

  it("switches lower-half content by toggle selection", () => {
    const freeModel = getMembershipPageModel({
      audience: "firm",
      currentPlan: MEMBERSHIP_PLAN.FREE,
      activeTab: MEMBERSHIP_PLAN.FREE,
    });
    const helpModel = getMembershipPageModel({
      audience: "firm",
      currentPlan: MEMBERSHIP_PLAN.FREE,
      activeTab: "HELP",
    });

    expect(freeModel.panel.kind).toBe("plan");
    expect(helpModel.panel.kind).toBe("narrative");
    expect(freeModel.panel.title).not.toBe(helpModel.panel.title);
  });

  it("renders exactly the requested membership tabs", () => {
    expect(getMembershipTabs()).toEqual([
      { key: MEMBERSHIP_PLAN.FREE, label: "Free" },
      { key: MEMBERSHIP_PLAN.PRO, label: "Pro" },
      { key: MEMBERSHIP_PLAN.ELITE, label: "Elite" },
      { key: "HELP", label: "Help" },
    ]);
  });

  it("keeps audience-specific copy and CTA routing explicit", () => {
    const vendorModel = getMembershipPageModel({
      audience: "vendor",
      currentPlan: MEMBERSHIP_PLAN.FREE,
      activeTab: MEMBERSHIP_PLAN.PRO,
    });
    const userModel = getMembershipPageModel({
      audience: "individual",
      currentPlan: MEMBERSHIP_PLAN.PRO,
      activeTab: MEMBERSHIP_PLAN.ELITE,
    });

    expect(vendorModel.hero.title).toMatch(/market motion/i);
    expect(vendorModel.panel.kind).toBe("plan");
    if (vendorModel.panel.kind === "plan") {
      expect(vendorModel.panel.ctaHref).toBe("/vendor/membership/payment-processing?plan=pro");
      expect(vendorModel.panel.why).toMatch(/sales|commercial/i);
      expect(vendorModel.panel.ctaLabel).toMatch(/payment processing/i);
    }

    expect(userModel.hero.title).toMatch(/personal operating depth/i);
    expect(userModel.panel.kind).toBe("plan");
    if (userModel.panel.kind === "plan") {
      expect(userModel.panel.ctaHref).toBe("/user/membership/payment-processing?plan=elite");
    }
  });

  it("builds role-specific payment-processing routes", () => {
    expect(buildMembershipCheckoutHref("vendor", MEMBERSHIP_PLAN.PRO)).toBe("/vendor/membership/payment-processing?plan=pro");
    expect(buildMembershipCheckoutHref("firm", MEMBERSHIP_PLAN.ELITE)).toBe("/firm/membership/payment-processing?plan=elite");
    expect(buildMembershipCheckoutHref("individual", MEMBERSHIP_PLAN.PRO)).toBe("/user/membership/payment-processing?plan=pro");
  });

  it("falls back to free when the current plan is missing or invalid", () => {
    const model = getMembershipPageModel({
      audience: "vendor",
      currentPlan: "UNKNOWN" as never,
    });

    expect(model.currentPlan).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(model.activeTab).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
  });

  it("normalizes invalid checkout plan params to the current or next safe tier", () => {
    expect(getRequestedCheckoutPlan(undefined, MEMBERSHIP_PLAN.FREE)).toBe(MEMBERSHIP_PLAN.PRO);
    expect(getRequestedCheckoutPlan("GOLD", MEMBERSHIP_PLAN.ELITE)).toBe(MEMBERSHIP_PLAN.ELITE);
    expect(getRequestedCheckoutPlan("FREE", MEMBERSHIP_PLAN.PRO)).toBe(MEMBERSHIP_PLAN.FREE);
  });
});
