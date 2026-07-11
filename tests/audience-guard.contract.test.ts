import { describe, expect, it } from "vitest";
import {
  audienceHomeFor,
  resolveAudienceRedirectTarget,
  type AudienceResolutionInput,
} from "@/lib/audiencePolicy";

/**
 * Audience guard (B5-4). A signed-in account on the wrong customer portal is
 * redirected to its own portal home; admin + consultant are unaffected; unknown
 * company kinds are never misrouted. Cross-tenant same-audience is out of scope
 * (unchanged 404 semantics).
 */

const firm: AudienceResolutionInput = { role: "OWNER", companyId: "c1", companyType: "FIRM", isConsultant: false };
const vendor: AudienceResolutionInput = { role: "OWNER", companyId: "c2", companyType: "VENDOR", isConsultant: false };
const individual: AudienceResolutionInput = { role: "MEMBER", companyId: null, companyType: null, isConsultant: false };
const admin: AudienceResolutionInput = { role: "ADMIN", companyId: "c3", companyType: "FIRM", isConsultant: false };
const consultant: AudienceResolutionInput = { role: "OWNER", companyId: "c4", companyType: "FIRM", isConsultant: true };
const unknownKind: AudienceResolutionInput = { role: "OWNER", companyId: "c5", companyType: null, isConsultant: false };

describe("audience guard — home resolution", () => {
  it("maps company kind to a home audience; admin/consultant/unknown → bypass (null)", () => {
    expect(audienceHomeFor(firm)).toBe("firm");
    expect(audienceHomeFor(vendor)).toBe("vendor");
    expect(audienceHomeFor(individual)).toBe("user");
    expect(audienceHomeFor(admin)).toBeNull();
    expect(audienceHomeFor(consultant)).toBeNull();
    expect(audienceHomeFor(unknownKind)).toBeNull();
  });
});

describe("audience guard — redirect target both directions", () => {
  it("firm account is redirected off /vendor and /user, stays on /firm", () => {
    expect(resolveAudienceRedirectTarget(firm, "vendor")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(firm, "user")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(firm, "firm")).toBeNull();
  });

  it("vendor account is redirected off /firm and /user, stays on /vendor", () => {
    expect(resolveAudienceRedirectTarget(vendor, "firm")).toBe("/vendor");
    expect(resolveAudienceRedirectTarget(vendor, "user")).toBe("/vendor");
    expect(resolveAudienceRedirectTarget(vendor, "vendor")).toBeNull();
  });

  it("individual is redirected off /firm and /vendor, stays on /user", () => {
    expect(resolveAudienceRedirectTarget(individual, "firm")).toBe("/user");
    expect(resolveAudienceRedirectTarget(individual, "vendor")).toBe("/user");
    expect(resolveAudienceRedirectTarget(individual, "user")).toBeNull();
  });

  it("admin and consultant are never redirected", () => {
    for (const segment of ["firm", "vendor", "user"] as const) {
      expect(resolveAudienceRedirectTarget(admin, segment)).toBeNull();
      expect(resolveAudienceRedirectTarget(consultant, segment)).toBeNull();
    }
  });

  it("an unresolved company kind is never misrouted", () => {
    for (const segment of ["firm", "vendor", "user"] as const) {
      expect(resolveAudienceRedirectTarget(unknownKind, segment)).toBeNull();
    }
  });
});
