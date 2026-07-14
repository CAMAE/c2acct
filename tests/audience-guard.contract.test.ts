import { describe, expect, it } from "vitest";
import {
  audienceHomeFor,
  resolveAudienceRedirectTarget,
  type AudienceResolutionInput,
} from "@/lib/audiencePolicy";

/**
 * Audience guard (B5-4, hardened by 13a). Every signed-in account has ONE home
 * portal and is redirected off every other. Realigned from the pre-13a behavior
 * where admin + consultant "bypassed" the wall (the null-audience hole that let
 * consultant creds occupy /vendor). Company binding wins over the ADMIN role, so
 * a firm/vendor OWNER/ADMIN stays in its own portal and only a company-LESS
 * operator reaches /admin. Unknown company kind is still never misrouted.
 * Exhaustive matrix lives in audience-role-wall.contract.test.ts.
 */

const firm: AudienceResolutionInput = { role: "OWNER", companyId: "c1", companyType: "FIRM", isConsultant: false };
const vendor: AudienceResolutionInput = { role: "OWNER", companyId: "c2", companyType: "VENDOR", isConsultant: false };
const individual: AudienceResolutionInput = { role: "MEMBER", companyId: null, companyType: null, isConsultant: false };
const platformAdmin: AudienceResolutionInput = { role: "ADMIN", companyId: null, companyType: null, isConsultant: false };
const firmAdmin: AudienceResolutionInput = { role: "ADMIN", companyId: "c3", companyType: "FIRM", isConsultant: false };
const consultant: AudienceResolutionInput = { role: "OWNER", companyId: "c4", companyType: "FIRM", isConsultant: true };
const unknownKind: AudienceResolutionInput = { role: "OWNER", companyId: "c5", companyType: null, isConsultant: false };

describe("audience guard — home resolution", () => {
  it("resolves a single home for every account; only unknown kind is null", () => {
    expect(audienceHomeFor(firm)).toBe("firm");
    expect(audienceHomeFor(vendor)).toBe("vendor");
    expect(audienceHomeFor(individual)).toBe("user");
    expect(audienceHomeFor(platformAdmin)).toBe("admin");
    expect(audienceHomeFor(firmAdmin)).toBe("firm"); // company wins over ADMIN role
    expect(audienceHomeFor(consultant)).toBe("consultant");
    expect(audienceHomeFor(unknownKind)).toBeNull();
  });
});

describe("audience guard — redirect target both directions", () => {
  it("firm account is redirected off other portals, stays on /firm", () => {
    expect(resolveAudienceRedirectTarget(firm, "vendor")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(firm, "user")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(firm, "consultant")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(firm, "admin")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(firm, "firm")).toBeNull();
  });

  it("vendor account is redirected off other portals, stays on /vendor", () => {
    expect(resolveAudienceRedirectTarget(vendor, "firm")).toBe("/vendor");
    expect(resolveAudienceRedirectTarget(vendor, "vendor")).toBeNull();
  });

  it("consultant is walled OUT of /firm and /vendor (the 13a P0), stays on /consultants", () => {
    expect(resolveAudienceRedirectTarget(consultant, "vendor")).toBe("/consultants");
    expect(resolveAudienceRedirectTarget(consultant, "firm")).toBe("/consultants");
    expect(resolveAudienceRedirectTarget(consultant, "consultant")).toBeNull();
  });

  it("a company-bound admin never reaches /admin; a company-less operator does", () => {
    expect(resolveAudienceRedirectTarget(firmAdmin, "admin")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(platformAdmin, "firm")).toBe("/admin");
    expect(resolveAudienceRedirectTarget(platformAdmin, "admin")).toBeNull();
  });

  it("an unresolved company kind is never misrouted", () => {
    for (const segment of ["firm", "vendor", "user", "consultant", "admin"] as const) {
      expect(resolveAudienceRedirectTarget(unknownKind, segment)).toBeNull();
    }
  });
});
