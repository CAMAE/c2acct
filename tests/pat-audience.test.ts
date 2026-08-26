import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Trust-boundary unit test for lib/patAssistant/audience.ts. The audience and
 * unrestricted flag are derived from the session + entitlements server-side —
 * never from the client. isAdminRole stays real (pure); the consultant + portal
 * lookups are mocked at the module boundary (no DB).
 *
 * Precedence under test: admin/owner > consultant > portal audience (strict).
 */

vi.mock("@/lib/consultantAccess", () => ({
  getConsultantAccessStateForUser: vi.fn(),
}));
vi.mock("@/lib/portalVisibility", () => ({
  resolvePortalExperience: vi.fn(),
}));
// Only the DB-touching resolver is replaced; the plan constants and the rank
// arithmetic stay real, so the depth-tier assertions below test the shipping
// comparison rather than a stub of it.
vi.mock("@/lib/membership", async () => {
  const actual = await vi.importActual<typeof import("@/lib/membership")>("@/lib/membership");
  return { ...actual, resolveCurrentMembership: vi.fn() };
});

import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { resolvePortalExperience } from "@/lib/portalVisibility";
import { NO_MEMBERSHIP, resolveCurrentMembership } from "@/lib/membership";
import { PUBLIC_AUDIENCE, readableDepthTiers } from "@/lib/patAssistant/corpusAccess";

const consultantMock = vi.mocked(getConsultantAccessStateForUser);
const portalMock = vi.mocked(resolvePortalExperience);
const membershipMock = vi.mocked(resolveCurrentMembership);

function membershipOf(plan: string) {
  return { membership: { plan }, context: {} } as unknown as Awaited<
    ReturnType<typeof resolveCurrentMembership>
  >;
}

function user(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "u@x.com", role, companyId: "c1" };
}

describe("resolvePatAudience — server-side audience + scope", () => {
  beforeEach(() => {
    consultantMock.mockReset();
    portalMock.mockReset();
    membershipMock.mockReset();
    membershipMock.mockResolvedValue(membershipOf(NO_MEMBERSHIP));
  });

  it("returns null for an unauthenticated caller", async () => {
    expect(await resolvePatAudience(null)).toBeNull();
  });

  it("admins are unrestricted (and skip the portal/consultant lookups)", async () => {
    const res = await resolvePatAudience(user("ADMIN"));
    expect(res).toEqual({ audience: "admin", unrestricted: true, membershipPlan: NO_MEMBERSHIP });
    expect(consultantMock).not.toHaveBeenCalled();
    expect(portalMock).not.toHaveBeenCalled();
  });

  it("owners are treated as admin", async () => {
    const res = await resolvePatAudience(user("OWNER"));
    expect(res).toEqual({ audience: "admin", unrestricted: true, membershipPlan: NO_MEMBERSHIP });
  });

  it("consultants are unrestricted", async () => {
    consultantMock.mockResolvedValue({
      sessionUser: user("MEMBER"),
      consultantProfileId: "cp1",
      consultantLabel: "C",
      ecosystems: [],
    });
    const res = await resolvePatAudience(user("MEMBER"));
    expect(res).toEqual({ audience: "consultant", unrestricted: true, membershipPlan: NO_MEMBERSHIP });
    expect(portalMock).not.toHaveBeenCalled();
  });

  it("everyone else gets their STRICT portal audience", async () => {
    consultantMock.mockResolvedValue(null);
    portalMock.mockResolvedValue({ audience: "vendor" } as Awaited<ReturnType<typeof resolvePortalExperience>>);
    membershipMock.mockResolvedValue(membershipOf("PRO"));
    const res = await resolvePatAudience(user("MEMBER"));
    expect(res).toEqual({ audience: "vendor", unrestricted: false, membershipPlan: "PRO" });
  });
});

/**
 * Corpus program (a)+(b) — the audience boundary now also decides DEPTH, so it
 * carries the membership plan. Both are server-resolved for the same reason:
 * each one decides what the SQL wall admits.
 */
describe("resolvePatAudience — depth tier and the reserved public audience", () => {
  beforeEach(() => {
    consultantMock.mockReset();
    portalMock.mockReset();
    membershipMock.mockReset();
    membershipMock.mockResolvedValue(membershipOf(NO_MEMBERSHIP));
  });

  it("never returns the reserved public audience for any authenticated role", async () => {
    // `public` marks content for an unauthenticated entry path. An authenticated
    // session producing it would be an audience escalation. (The type system
    // also forbids it — see PublicIsNotAPortalAudience in audience.ts.)
    consultantMock.mockResolvedValue(null);
    for (const role of ["ADMIN", "OWNER", "MEMBER"] as const) {
      portalMock.mockResolvedValue({ audience: "vendor" } as Awaited<
        ReturnType<typeof resolvePortalExperience>
      >);
      const res = await resolvePatAudience(user(role));
      expect(res?.audience).not.toBe(PUBLIC_AUDIENCE);
    }
  });

  it("gives an ELITE member both tiers and everyone else only CORE", async () => {
    consultantMock.mockResolvedValue(null);
    portalMock.mockResolvedValue({ audience: "firm" } as Awaited<
      ReturnType<typeof resolvePortalExperience>
    >);

    membershipMock.mockResolvedValue(membershipOf("ELITE"));
    const elite = await resolvePatAudience(user("MEMBER"));
    expect(readableDepthTiers(elite!.membershipPlan)).toEqual(["CORE", "ELITE"]);

    membershipMock.mockResolvedValue(membershipOf("PRO"));
    const pro = await resolvePatAudience(user("MEMBER"));
    expect(readableDepthTiers(pro!.membershipPlan)).toEqual(["CORE"]);
  });

  it("gives consultant and admin CORE depth despite being unrestricted", async () => {
    // unrestricted drops the AUDIENCE predicate, never the TIER predicate.
    // Being entitled to ask about any audience's help is not the same
    // entitlement as being entitled to read paid depth.
    const admin = await resolvePatAudience(user("ADMIN"));
    expect(admin!.unrestricted).toBe(true);
    expect(readableDepthTiers(admin!.membershipPlan)).toEqual(["CORE"]);

    consultantMock.mockResolvedValue({
      sessionUser: user("MEMBER"),
      consultantProfileId: "cp1",
      consultantLabel: "C",
      ecosystems: [],
    });
    const consultant = await resolvePatAudience(user("MEMBER"));
    expect(consultant!.unrestricted).toBe(true);
    expect(readableDepthTiers(consultant!.membershipPlan)).toEqual(["CORE"]);
  });

  it("degrades to no membership when the membership lookup fails", async () => {
    // A membership lookup that errors must degrade to LESS access, never more,
    // and never to a 500 on a help question.
    consultantMock.mockResolvedValue(null);
    portalMock.mockResolvedValue({ audience: "vendor" } as Awaited<
      ReturnType<typeof resolvePortalExperience>
    >);
    membershipMock.mockRejectedValue(new Error("billing down"));
    const res = await resolvePatAudience(user("MEMBER"));
    expect(res!.membershipPlan).toBe(NO_MEMBERSHIP);
    expect(readableDepthTiers(res!.membershipPlan)).toEqual(["CORE"]);
  });
});
