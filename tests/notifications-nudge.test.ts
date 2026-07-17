import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Authorization trust-boundary test for the nudge path. isAdminRole is real
 * (pure). Only admins or in-scope consultants may nudge a company; everyone else
 * is denied. (Sending is covered by tests/nudge-draft.contract.test.ts — 16c
 * moved the send behind the approval queue.)
 */

vi.mock("@/lib/consultantAccess", () => ({ getConsultantAccessStateForUser: vi.fn() }));

import { authorizeCompanyNudge, buildNudgeMessage, nudgeFromLabel } from "@/lib/notifications/nudge";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";

const consultant = vi.mocked(getConsultantAccessStateForUser);

function user(role: SessionUser["role"]): SessionUser {
  return { id: "actor1", email: "a@x.com", role, companyId: null };
}

function consultantState(firmId: string) {
  return {
    sessionUser: user("MEMBER"),
    consultantProfileId: "cp1",
    consultantLabel: "Jane Consultant",
    ecosystems: [
      {
        assignmentId: "a1",
        ecosystemId: "e1",
        ecosystemName: "Eco",
        vendorCompanyId: "v1",
        vendorCompanyName: "Vendor",
        firmCompanies: [{ id: firmId, name: "Firm" }],
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  consultant.mockResolvedValue(null);
});

describe("authorizeCompanyNudge", () => {
  it("admins may nudge any company (no consultant lookup)", async () => {
    const res = await authorizeCompanyNudge(user("ADMIN"), "firm1");
    expect(res).toEqual({ kind: "admin" });
    expect(consultant).not.toHaveBeenCalled();
  });

  it("consultants may nudge a company in their ecosystem scope", async () => {
    consultant.mockResolvedValue(consultantState("firm1"));
    const res = await authorizeCompanyNudge(user("MEMBER"), "firm1");
    expect(res).toEqual({ kind: "consultant", consultantLabel: "Jane Consultant" });
  });

  it("denies a consultant nudging a company outside their scope", async () => {
    consultant.mockResolvedValue(consultantState("firm1"));
    expect(await authorizeCompanyNudge(user("MEMBER"), "other")).toEqual({ kind: "denied" });
  });

  it("denies a plain member with no consultant access", async () => {
    expect(await authorizeCompanyNudge(user("MEMBER"), "firm1")).toEqual({ kind: "denied" });
  });
});

describe("nudge message helpers", () => {
  it("nudgeFromLabel uses the consultant name, or a generic operator label for admins", () => {
    expect(nudgeFromLabel({ kind: "consultant", consultantLabel: "Jane" })).toBe("Jane");
    expect(nudgeFromLabel({ kind: "admin" })).toBe("A Patalign operator");
  });

  it("buildNudgeMessage targets the right assessment surface per audience", () => {
    expect(buildNudgeMessage("firm", "Jane").ctaHref).toBe("/firm/alignment-assessment");
    expect(buildNudgeMessage("vendor", "Jane").ctaHref).toBe("/vendor/product-assessment");
  });
});
