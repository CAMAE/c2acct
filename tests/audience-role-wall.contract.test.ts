import { describe, expect, it } from "vitest";
import type { CompanyType, UserRole } from "@prisma/client";
import {
  AUDIENCE_HOME_PATH,
  audienceHomeFor,
  resolveAudienceRedirectTarget,
  type AudienceResolutionInput,
  type PortalAudienceSegment,
} from "@/lib/audiencePolicy";

/**
 * 13a role wall (P0). Every account has exactly one home portal; every other
 * portal must redirect there — both directions. Repro that failed the sweep:
 * consultant creds reached the /vendor workspace.
 */
const mk = (o: Partial<AudienceResolutionInput>): AudienceResolutionInput => ({
  role: "MEMBER" as UserRole,
  companyId: null,
  companyType: null,
  isConsultant: false,
  ...o,
});

const PROFILES: Record<string, { input: AudienceResolutionInput; home: PortalAudienceSegment }> = {
  "firm member": { input: mk({ role: "MEMBER" as UserRole, companyId: "c1", companyType: "FIRM" as CompanyType }), home: "firm" },
  "firm owner": { input: mk({ role: "OWNER" as UserRole, companyId: "c1", companyType: "FIRM" as CompanyType }), home: "firm" },
  "firm admin": { input: mk({ role: "ADMIN" as UserRole, companyId: "c1", companyType: "FIRM" as CompanyType }), home: "firm" },
  "vendor member": { input: mk({ role: "MEMBER" as UserRole, companyId: "v1", companyType: "VENDOR" as CompanyType }), home: "vendor" },
  "consultant": { input: mk({ isConsultant: true }), home: "consultant" },
  "platform admin": { input: mk({ role: "ADMIN" as UserRole }), home: "admin" },
  "individual": { input: mk({}), home: "user" },
};

const SEGMENTS: PortalAudienceSegment[] = ["firm", "vendor", "user", "consultant", "admin"];

describe("13a role wall — every account is confined to its home portal", () => {
  for (const [name, { input, home }] of Object.entries(PROFILES)) {
    it(`${name} → home ${home}`, () => {
      expect(audienceHomeFor(input)).toBe(home);
    });

    for (const segment of SEGMENTS) {
      const expected = segment === home ? null : AUDIENCE_HOME_PATH[home];
      it(`${name} on /${segment} → ${expected ?? "stays"}`, () => {
        expect(resolveAudienceRedirectTarget(input, segment)).toBe(expected);
      });
    }
  }

  it("P0: consultant creds are walled OUT of the vendor workspace", () => {
    expect(resolveAudienceRedirectTarget(PROFILES.consultant.input, "vendor")).toBe("/consultants");
    expect(resolveAudienceRedirectTarget(PROFILES.consultant.input, "firm")).toBe("/consultants");
  });

  it("parallel hole: a firm OWNER cannot reach /admin or /vendor", () => {
    expect(resolveAudienceRedirectTarget(PROFILES["firm owner"].input, "admin")).toBe("/firm");
    expect(resolveAudienceRedirectTarget(PROFILES["firm owner"].input, "vendor")).toBe("/firm");
  });

  it("company binding wins over ADMIN role (company-admin stays in its portal, never /admin)", () => {
    expect(audienceHomeFor(PROFILES["firm admin"].input)).toBe("firm");
    expect(resolveAudienceRedirectTarget(PROFILES["firm admin"].input, "admin")).toBe("/firm");
  });

  it("only a company-less operator resolves to /admin", () => {
    expect(audienceHomeFor(PROFILES["platform admin"].input)).toBe("admin");
    expect(resolveAudienceRedirectTarget(PROFILES["platform admin"].input, "firm")).toBe("/admin");
  });

  it("unknown company kind never misroutes (stays put, grants nothing new)", () => {
    const weird = mk({ companyId: "x1", companyType: null });
    expect(audienceHomeFor(weird)).toBeNull();
    for (const segment of SEGMENTS) {
      expect(resolveAudienceRedirectTarget(weird, segment)).toBeNull();
    }
  });
});
