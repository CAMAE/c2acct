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

import { resolvePatAudience } from "@/lib/patAssistant/audience";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { resolvePortalExperience } from "@/lib/portalVisibility";

const consultantMock = vi.mocked(getConsultantAccessStateForUser);
const portalMock = vi.mocked(resolvePortalExperience);

function user(role: SessionUser["role"]): SessionUser {
  return { id: "u1", email: "u@x.com", role, companyId: "c1" };
}

describe("resolvePatAudience — server-side audience + scope", () => {
  beforeEach(() => {
    consultantMock.mockReset();
    portalMock.mockReset();
  });

  it("returns null for an unauthenticated caller", async () => {
    expect(await resolvePatAudience(null)).toBeNull();
  });

  it("admins are unrestricted (and skip the portal/consultant lookups)", async () => {
    const res = await resolvePatAudience(user("ADMIN"));
    expect(res).toEqual({ audience: "admin", unrestricted: true });
    expect(consultantMock).not.toHaveBeenCalled();
    expect(portalMock).not.toHaveBeenCalled();
  });

  it("owners are treated as admin", async () => {
    const res = await resolvePatAudience(user("OWNER"));
    expect(res).toEqual({ audience: "admin", unrestricted: true });
  });

  it("consultants are unrestricted", async () => {
    consultantMock.mockResolvedValue({
      sessionUser: user("MEMBER"),
      consultantProfileId: "cp1",
      consultantLabel: "C",
      ecosystems: [],
    });
    const res = await resolvePatAudience(user("MEMBER"));
    expect(res).toEqual({ audience: "consultant", unrestricted: true });
    expect(portalMock).not.toHaveBeenCalled();
  });

  it("everyone else gets their STRICT portal audience", async () => {
    consultantMock.mockResolvedValue(null);
    portalMock.mockResolvedValue({ audience: "vendor" } as Awaited<ReturnType<typeof resolvePortalExperience>>);
    const res = await resolvePatAudience(user("MEMBER"));
    expect(res).toEqual({ audience: "vendor", unrestricted: false });
  });
});
