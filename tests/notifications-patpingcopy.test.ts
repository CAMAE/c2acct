import { describe, expect, it } from "vitest";
import { composePatPingCopy } from "@/lib/notifications/patPingCopy";

/**
 * composePatPingCopy is pure + deterministic (Block E). These lock Pat's voice:
 * it opens in first person ("Hi, it's Pat"), states a whole-number percent, and
 * ends with a low-pressure ask — reminders address the account directly,
 * escalations name it to the consultant in the third person.
 */

describe("composePatPingCopy — reminders (to the firm/vendor)", () => {
  it("firm inactivity: direct address, percent, alignment CTA", () => {
    const copy = composePatPingCopy({
      kind: "reminder",
      reason: "inactivity",
      audience: "firm",
      completionPercent: 40,
    });
    expect(copy.title).toBe("A note from Pat");
    expect(copy.body).toContain("Hi, it's Pat");
    expect(copy.body).toContain("you're at 40%");
    expect(copy.body).toContain("alignment assessment");
    expect(copy.ctaHref).toBe("/firm/alignment-assessment");
    expect(copy.ctaLabel).toBe("Open your alignment assessment");
  });

  it("firm deadline: references the quarter close", () => {
    const copy = composePatPingCopy({
      kind: "reminder",
      reason: "deadline",
      audience: "firm",
      completionPercent: 30,
    });
    expect(copy.body).toContain("quarter close");
    expect(copy.body).toContain("you're at 30%");
  });

  it("vendor: product-assessment wording + CTA", () => {
    const copy = composePatPingCopy({
      kind: "reminder",
      reason: "inactivity",
      audience: "vendor",
      completionPercent: 0,
    });
    expect(copy.body).toContain("product self-assessment");
    expect(copy.ctaHref).toBe("/vendor/product-assessment");
  });

  it("rounds the percent (no fake sub-point precision)", () => {
    const copy = composePatPingCopy({
      kind: "reminder",
      reason: "inactivity",
      audience: "firm",
      completionPercent: 42.7,
    });
    expect(copy.body).toContain("43%");
    expect(copy.body).not.toContain("42.7");
  });
});

describe("composePatPingCopy — escalation (to the consultant)", () => {
  it("names the account in the third person with a low-pressure ask", () => {
    const copy = composePatPingCopy({
      kind: "escalation",
      audience: "firm",
      completionPercent: 40,
      companyName: "Northwind LLP",
    });
    expect(copy.title).toBe("Pat flagged an account worth a nudge");
    expect(copy.body).toContain("Hi, it's Pat");
    expect(copy.body).toContain("Northwind LLP is at 40%");
    expect(copy.body).toContain("Worth a personal nudge?");
    // Escalations carry no CTA — the consultant decides how to reach out.
    expect(copy.ctaLabel).toBeNull();
    expect(copy.ctaHref).toBeNull();
  });

  it("falls back to a generic reference when the name is missing", () => {
    const copy = composePatPingCopy({
      kind: "escalation",
      audience: "vendor",
      completionPercent: 25,
      companyName: "",
    });
    expect(copy.body).toContain("a vendor you manage is at 25%");
  });
});
