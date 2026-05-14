import { describe, expect, it } from "vitest";
import { DEFAULT_FREE_MEMBERSHIP_PLAN, MEMBERSHIP_PLAN, MEMBERSHIP_STATUS } from "@/lib/membership";
import {
  buildMembershipCheckoutHref,
  getMembershipCheckoutModel,
  getDefaultMembershipTab,
  getMembershipPageModel,
  getMembershipTabs,
  getMembershipTierDetailModel,
  getRequestedCheckoutPlan,
  getRequestedMembershipPaymentMethod,
} from "@/lib/membershipContent";

describe("membership page contracts", () => {
  it("defaults the active toggle to the current membership plan", () => {
    expect(getDefaultMembershipTab(MEMBERSHIP_PLAN.FREE)).toBe(MEMBERSHIP_PLAN.PRO);
    expect(getDefaultMembershipTab(MEMBERSHIP_PLAN.PRO)).toBe(MEMBERSHIP_PLAN.PRO);
    expect(getDefaultMembershipTab(MEMBERSHIP_PLAN.ELITE)).toBe(MEMBERSHIP_PLAN.ELITE);
  });

  it("switches lower-half content by toggle selection", () => {
    const proModel = getMembershipPageModel({
      audience: "firm",
      currentPlan: MEMBERSHIP_PLAN.FREE,
      activeTab: MEMBERSHIP_PLAN.PRO,
    });
    const helpModel = getMembershipPageModel({
      audience: "firm",
      currentPlan: MEMBERSHIP_PLAN.FREE,
      activeTab: "HELP",
    });

    expect(proModel.panel.kind).toBe("plan");
    expect(helpModel.panel.kind).toBe("help");
    expect(proModel.panel.title).not.toBe(helpModel.panel.title);
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

    expect(vendorModel.hero.title).toMatch(/vendor/i);
    expect(vendorModel.hero.title).toMatch(/market motion/i);
    expect(vendorModel.panel.kind).toBe("plan");
    if (vendorModel.panel.kind === "plan") {
      expect(vendorModel.panel.ctaHref).toBe("/vendor/membership/checkout?plan=pro");
      expect(vendorModel.panel.why).toMatch(/sales|commercial/i);
    }

    expect(userModel.hero.title).toMatch(/individual/i);
    expect(userModel.hero.title).toMatch(/personal operating depth/i);
    expect(userModel.panel.kind).toBe("plan");
    if (userModel.panel.kind === "plan") {
      expect(userModel.panel.ctaHref).toBe("/user/membership/checkout?plan=elite");
    }
  });

  it("builds role-specific checkout scaffold routes", () => {
    expect(buildMembershipCheckoutHref("vendor", MEMBERSHIP_PLAN.PRO)).toBe("/vendor/membership/checkout?plan=pro");
    expect(buildMembershipCheckoutHref("firm", MEMBERSHIP_PLAN.ELITE)).toBe("/firm/membership/checkout?plan=elite");
    expect(buildMembershipCheckoutHref("individual", MEMBERSHIP_PLAN.PRO)).toBe("/user/membership/checkout?plan=pro");
  });

  it("keeps the membership toggle order stable for the shared portal-style switcher", () => {
    expect(getMembershipTabs()).toEqual([
      { key: MEMBERSHIP_PLAN.PRO, label: "Pro Membership" },
      { key: MEMBERSHIP_PLAN.ELITE, label: "Elite Membership" },
      { key: "HELP", label: "Help" },
    ]);
  });

  it("falls back to free when the current plan is missing or invalid", () => {
    const model = getMembershipPageModel({
      audience: "vendor",
      currentPlan: "UNKNOWN" as never,
    });

    expect(model.currentPlan).toBe(DEFAULT_FREE_MEMBERSHIP_PLAN);
    expect(model.activeTab).toBe(MEMBERSHIP_PLAN.PRO);
  });

  it("normalizes invalid checkout plan params to the current or next safe tier", () => {
    expect(getRequestedCheckoutPlan(undefined, MEMBERSHIP_PLAN.FREE)).toBe(MEMBERSHIP_PLAN.PRO);
    expect(getRequestedCheckoutPlan("GOLD", MEMBERSHIP_PLAN.ELITE)).toBe(MEMBERSHIP_PLAN.ELITE);
    expect(getRequestedCheckoutPlan("FREE", MEMBERSHIP_PLAN.PRO)).toBe(MEMBERSHIP_PLAN.PRO);
  });

  it("defaults checkout payment methods to scaffold mode when billing is not configured", () => {
    const model = getMembershipCheckoutModel({
      audience: "vendor",
      selectedPlan: MEMBERSHIP_PLAN.PRO,
      currentPlan: MEMBERSHIP_PLAN.FREE,
      currentStatus: MEMBERSHIP_STATUS.ACTIVE,
      billingMode: "scaffold",
      billingDisabledReason: "billing_disabled",
    });

    expect(getRequestedMembershipPaymentMethod(undefined)).toBe("card");
    expect(getRequestedMembershipPaymentMethod("stripe")).toBe("stripe");
    expect(getRequestedMembershipPaymentMethod("unknown")).toBe("card");
    expect(model.summary.paymentStateLabel).toBe("Scaffold only");
    expect(model.billing.truthLabel).toBe("No live charge will be created.");
    expect(model.paymentMethods).toEqual([
      { key: "card", label: "Credit/Debit", state: "default", statusLabel: "Scaffold" },
      { key: "bank", label: "Billing contact", state: "default", statusLabel: "Scaffold" },
      { key: "paypal", label: "PayPal", state: "locked", statusLabel: "Future" },
      { key: "stripe", label: "Stripe", state: "locked", statusLabel: "Future" },
      { key: "square", label: "Square", state: "locked", statusLabel: "Future" },
    ]);
  });

  it("builds method-specific checkout field scaffolds without claiming live processing", () => {
    const model = getMembershipCheckoutModel({
      audience: "firm",
      selectedPlan: MEMBERSHIP_PLAN.ELITE,
      currentPlan: MEMBERSHIP_PLAN.PRO,
      currentStatus: MEMBERSHIP_STATUS.PENDING_CHECKOUT,
      billingMode: "scaffold",
    });

    expect(model.summary.processingNote).toMatch(/No live payment processor/i);
    expect(model.paymentPanels.card.fields).not.toContain("Card number");
    expect(model.paymentPanels.card.fields).not.toContain("Security code");
    expect(model.paymentPanels.card.fields).toContain("Billing contact name");
    expect(model.paymentPanels.bank.fields).toContain("Future bank customer reference");
    expect(model.paymentPanels.paypal.detail).toMatch(/does not open a PayPal session/i);
    expect(model.paymentPanels.stripe.detail).toMatch(/does not store raw card numbers/i);
    expect(model.paymentPanels.square.detail).toMatch(/does not initialize a Square payment form/i);
    expect(model.explanation.afterSubmitBody).toMatch(/records checkout intent/i);
    expect(model.navigation.membershipHref).toBe("/firm/membership?tab=elite");
    expect(model.navigation.workspaceHref).toBe("/firm");
    expect(model.submitLabel).toBe("Record Elite checkout intent");
  });

  it("switches checkout copy to Stripe-hosted provider mode only when configured", () => {
    const model = getMembershipCheckoutModel({
      audience: "individual",
      selectedPlan: MEMBERSHIP_PLAN.PRO,
      currentPlan: MEMBERSHIP_PLAN.FREE,
      currentStatus: MEMBERSHIP_STATUS.ACTIVE,
      billingMode: "provider",
    });

    expect(model.hero.title).toBe("Pro membership checkout");
    expect(model.summary.paymentStateLabel).toBe("Stripe configured");
    expect(model.summary.processingNote).toMatch(/Stripe-hosted checkout/i);
    expect(model.billing.truthLabel).toMatch(/does not store card numbers/i);
    expect(model.paymentMethods).toEqual([
      { key: "stripe", label: "Stripe-hosted checkout", state: "default", statusLabel: "Configured" },
    ]);
    expect(model.explanation.afterSubmitBody).toMatch(/signed webhook reconciliation/i);
    expect(model.billingPortal.enabled).toBe(true);
    expect(model.submitLabel).toBe("Continue to Stripe checkout");
  });

  it("keeps the tier detail view focused on honest plan detail rather than live-route cards", () => {
    const model = getMembershipTierDetailModel({
      audience: "vendor",
      plan: MEMBERSHIP_PLAN.PRO,
      currentPlan: MEMBERSHIP_PLAN.FREE,
      currentStatus: MEMBERSHIP_STATUS.ACTIVE,
    });

    expect(model.sections.map((section) => section.title)).toEqual([
      "What it is",
      "What's available today",
      "What's coming next",
      "Why it helps",
    ]);
    expect(model.actionHref).toBe("/vendor/membership/checkout?plan=pro");
    expect(model.workspaceHref).toBe("/vendor");
  });
});
