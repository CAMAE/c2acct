import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONSULTANT_ACCESS_FLAG_ENV, resolveVendorSurfaceAccess } from "@/lib/consultantAccess";
import type { ConsultantAccessState } from "@/lib/consultantAccess";
import type { MembershipEntitlementSnapshot } from "@/lib/membership";

// Block E (WS-PERF-TENANCY-AUDIT-001, audit Should-Fix #1): pin the
// discriminated-union behavior of resolveVendorSurfaceAccess so any future
// audience-gating policy change has to update this test deliberately.
//
// Mocks the prisma + env state that getConsultantAccessStateForUser consumes
// internally, mirroring the pattern from tests/consultant-access.contract.test.ts.

const { findUniqueMock, matchesPrismaMissingSchemaTargetMock, warnPrismaCompatibilityOnceMock } =
  vi.hoisted(() => ({
    findUniqueMock: vi.fn(),
    matchesPrismaMissingSchemaTargetMock: vi.fn(),
    warnPrismaCompatibilityOnceMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  default: {
    consultantProfile: {
      findUnique: findUniqueMock,
    },
  },
}));

vi.mock("@/lib/prisma-compat", () => ({
  matchesPrismaMissingSchemaTarget: matchesPrismaMissingSchemaTargetMock,
  warnPrismaCompatibilityOnce: warnPrismaCompatibilityOnceMock,
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionUser: vi.fn(),
}));

const sessionUser = {
  id: "user_vendor",
  email: "review.vendor@pat.local",
  role: "MEMBER",
  companyId: "company_vendor",
} as const;

const consultantSessionUser = {
  id: "user_consultant",
  email: "review.consultant@pat.local",
  role: "MEMBER",
  companyId: null,
} as const;

function buildEntitlement(allowed: boolean): MembershipEntitlementSnapshot {
  return {
    allowed,
    requiredPlan: "PRO",
    membershipHref: "/vendor/membership",
    upgradeHref: "/vendor/membership/checkout?plan=pro",
    context: {} as MembershipEntitlementSnapshot["context"],
    membership: {} as MembershipEntitlementSnapshot["membership"],
  };
}

function buildConsultantProfile(): unknown {
  return {
    id: "consultant_profile_1",
    active: true,
    User: { name: "Review Consultant", email: consultantSessionUser.email },
    ConsultantAssignment: {
      id: "assignment_1",
      ecosystemId: "ecosystem_1",
      Ecosystem: {
        id: "ecosystem_1",
        name: "Test Ecosystem",
        vendorCompanyId: "vendor_company_1",
        VendorCompany: { id: "vendor_company_1", name: "Vendor Co" },
        EcosystemFirm: [],
      },
    },
  };
}

describe("resolveVendorSurfaceAccess (Block E)", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    matchesPrismaMissingSchemaTargetMock.mockReset();
    warnPrismaCompatibilityOnceMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns kind=consultant when the user has an active consultant profile (bypass)", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
    findUniqueMock.mockResolvedValue(buildConsultantProfile());

    const result = await resolveVendorSurfaceAccess(
      consultantSessionUser as unknown as Parameters<typeof resolveVendorSurfaceAccess>[0],
      buildEntitlement(false)
    );

    expect(result.kind).toBe("consultant");
    if (result.kind === "consultant") {
      expect(result.consultantAccess.consultantProfileId).toBe("consultant_profile_1");
    }
  });

  it("returns kind=vendor-allowed for a vendor with an active entitlement (no consultant profile)", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "0"); // flag off — getConsultantAccessStateForUser returns null
    findUniqueMock.mockResolvedValue(null);

    const result = await resolveVendorSurfaceAccess(
      sessionUser as unknown as Parameters<typeof resolveVendorSurfaceAccess>[0],
      buildEntitlement(true)
    );

    expect(result.kind).toBe("vendor-allowed");
    if (result.kind === "vendor-allowed") {
      expect(result.entitlement.allowed).toBe(true);
    }
  });

  it("returns kind=denied when the user is neither a consultant nor has entitlement", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "0");
    findUniqueMock.mockResolvedValue(null);

    const result = await resolveVendorSurfaceAccess(
      sessionUser as unknown as Parameters<typeof resolveVendorSurfaceAccess>[0],
      buildEntitlement(false)
    );

    expect(result.kind).toBe("denied");
    if (result.kind === "denied") {
      expect(result.entitlement.allowed).toBe(false);
    }
  });

  it("denies when entitlement is allowed=false even if consultant flag is on but profile is inactive", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
    findUniqueMock.mockResolvedValue({ ...(buildConsultantProfile() as Record<string, unknown>), active: false });

    const result = await resolveVendorSurfaceAccess(
      consultantSessionUser as unknown as Parameters<typeof resolveVendorSurfaceAccess>[0],
      buildEntitlement(false)
    );

    expect(result.kind).toBe("denied");
  });

  // Suppress unused import warning — kept in the import block as a documentation
  // anchor; the live assertions use the runtime shape via type guards above.
  void ({} as ConsultantAccessState);
});
