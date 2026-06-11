import { describe, expect, it } from "vitest";
import { validatePilotPassword } from "@/lib/auth/passwords";
import {
  generateTemporaryPassword,
  PROVISION_ORG_KINDS,
  validateProvisionAccountRequest,
} from "@/lib/provisioning/account";

describe("validateProvisionAccountRequest", () => {
  it("accepts a valid firm request and normalizes kind + email casing", () => {
    const result = validateProvisionAccountRequest({
      orgKind: "Firm",
      orgName: "  Acme CPA Group  ",
      ownerEmail: "Jane@AcmeCPA.com",
    });
    expect(result).toEqual({
      ok: true,
      orgKind: "firm",
      orgName: "Acme CPA Group",
      ownerEmail: "jane@acmecpa.com",
    });
  });

  it("accepts vendor as an org kind", () => {
    const result = validateProvisionAccountRequest({
      orgKind: "vendor",
      orgName: "Bridgepath Suite",
      ownerEmail: "ops@bridgepath.example",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects a blank org name", () => {
    const result = validateProvisionAccountRequest({
      orgKind: "firm",
      orgName: "   ",
      ownerEmail: "jane@acmecpa.com",
    });
    expect(result).toMatchObject({ ok: false, code: "invalid_org_name" });
  });

  it("rejects org kinds outside firm/vendor (pilot cohort boundary)", () => {
    for (const orgKind of ["individual", "invitee", "consultant", ""]) {
      const result = validateProvisionAccountRequest({
        orgKind,
        orgName: "Acme CPA Group",
        ownerEmail: "jane@acmecpa.com",
      });
      expect(result).toMatchObject({ ok: false, code: "invalid_org_kind" });
    }
    expect(PROVISION_ORG_KINDS).toEqual(["firm", "vendor"]);
  });

  it("rejects malformed owner emails", () => {
    for (const ownerEmail of ["not-an-email", "jane@", "@acme.com", "jane @acme.com", "jane@acme"]) {
      const result = validateProvisionAccountRequest({
        orgKind: "firm",
        orgName: "Acme CPA Group",
        ownerEmail,
      });
      expect(result).toMatchObject({ ok: false, code: "invalid_email" });
    }
  });
});

describe("generateTemporaryPassword", () => {
  it("always satisfies the pilot password policy", () => {
    for (let i = 0; i < 50; i += 1) {
      const password = generateTemporaryPassword();
      expect(validatePilotPassword(password).ok).toBe(true);
      expect(password.length).toBeGreaterThanOrEqual(12);
    }
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateTemporaryPassword()));
    expect(seen.size).toBe(20);
  });
});
