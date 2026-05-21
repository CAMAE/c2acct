import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CompanyType } from "@prisma/client";
import {
  CONSULTANT_ACCESS_FLAG_ENV,
  resolveVendorSurfaceAccess,
} from "@/lib/consultantAccess";
import { LOCAL_REVIEW_USERS } from "@/lib/auth/localReview";
import type { MembershipEntitlementSnapshot } from "@/lib/membership";

// Block D (WS-TEST-COVERAGE-001, reformulated per Cam's Correction 3
// because Block A — the resolveCurrentMembershipOrNull path — is
// deferred to a future session): pin the regression anchor for
// punch-list items 5-7 (consultant locked out of vendor surfaces) so
// the consultant-bypass + local-review-user contract can't silently
// drift.
//
// Two facets covered here:
//   1. LOCAL_REVIEW_USERS table shape — review.vendor / review.firm /
//      review.consultant rows must keep their companyType, redirect
//      target, and presence so the local-review seed remains coherent
//      with the e2e suite's sign-in assertions.
//   2. resolveVendorSurfaceAccess (Block E) — a consultant session with
//      a denied entitlement must resolve to kind="consultant" (bypass)
//      across the three vendor surfaces. This is the contract that
//      prevents recurrence of the 5.13.26 regression where consultants
//      could not see /vendor/{product-assessment, product-insight,
//      alignment-insights}.
//
// True DB-backed resolveCurrentMembership coverage for the seeded
// review.* accounts is intentionally NOT in scope here — vitest in this
// repo runs as a unit harness with mocked prisma. The e2e suite at
// e2e/local-review-auth.spec.ts is the canonical place for live DB
// assertions over the seeded membership rows.

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

function buildDeniedEntitlement(): MembershipEntitlementSnapshot {
  return {
    allowed: false,
    requiredPlan: "PRO",
    membershipHref: "/vendor/membership",
    upgradeHref: "/vendor/membership/checkout?plan=pro",
    context: {} as MembershipEntitlementSnapshot["context"],
    membership: {} as MembershipEntitlementSnapshot["membership"],
  };
}

function buildConsultantProfile() {
  return {
    id: "consultant_profile_1",
    active: true,
    User: { name: "Review Consultant", email: "review.consultant@pat.local" },
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

describe("demo accounts and consultant bypass (Block D)", () => {
  beforeEach(() => {
    findUniqueMock.mockReset();
    matchesPrismaMissingSchemaTargetMock.mockReset();
    warnPrismaCompatibilityOnceMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("LOCAL_REVIEW_USERS table shape", () => {
    it("includes review.vendor@pat.local with VENDOR companyType routing to /vendor", () => {
      const vendor = LOCAL_REVIEW_USERS.find((u) => u.email === "review.vendor@pat.local");
      expect(vendor).toBeDefined();
      expect(vendor?.companyType).toBe(CompanyType.VENDOR);
      expect(vendor?.redirectTo).toBe("/vendor");
    });

    it("includes review.firm@pat.local with FIRM companyType routing to /firm", () => {
      const firm = LOCAL_REVIEW_USERS.find((u) => u.email === "review.firm@pat.local");
      expect(firm).toBeDefined();
      expect(firm?.companyType).toBe(CompanyType.FIRM);
      expect(firm?.redirectTo).toBe("/firm");
    });

    it("includes review.consultant@pat.local with null companyType routing to /consultants", () => {
      const consultant = LOCAL_REVIEW_USERS.find((u) => u.email === "review.consultant@pat.local");
      expect(consultant).toBeDefined();
      expect(consultant?.companyType).toBeNull();
      expect(consultant?.redirectTo).toBe("/consultants");
    });
  });

  describe("consultant bypass on vendor surfaces (punch-list items 5-7 regression anchor)", () => {
    const consultantSessionUser = {
      id: "user_consultant",
      email: "review.consultant@pat.local",
      role: "MEMBER",
      companyId: null,
    } as const;

    it("review.consultant resolves to kind='consultant' even with denied entitlement (vendor surface bypass)", async () => {
      vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
      findUniqueMock.mockResolvedValue(buildConsultantProfile());

      const result = await resolveVendorSurfaceAccess(
        consultantSessionUser as unknown as Parameters<typeof resolveVendorSurfaceAccess>[0],
        buildDeniedEntitlement()
      );

      expect(result.kind).toBe("consultant");
    });

    it("review.consultant with inactive profile is correctly denied (does NOT bypass)", async () => {
      vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
      findUniqueMock.mockResolvedValue({ ...buildConsultantProfile(), active: false });

      const result = await resolveVendorSurfaceAccess(
        consultantSessionUser as unknown as Parameters<typeof resolveVendorSurfaceAccess>[0],
        buildDeniedEntitlement()
      );

      expect(result.kind).toBe("denied");
    });

    it("review.consultant denied when PAT_ENABLE_CONSULTANT_ACCESS flag is off (pilot default)", async () => {
      vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "0");
      findUniqueMock.mockResolvedValue(buildConsultantProfile());

      const result = await resolveVendorSurfaceAccess(
        consultantSessionUser as unknown as Parameters<typeof resolveVendorSurfaceAccess>[0],
        buildDeniedEntitlement()
      );

      expect(result.kind).toBe("denied");
    });
  });
});
