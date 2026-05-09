import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONSULTANT_ACCESS_FLAG_ENV, getConsultantAccessStateForUser } from "@/lib/consultantAccess";

const {
  findUniqueMock,
  matchesPrismaMissingSchemaTargetMock,
  warnPrismaCompatibilityOnceMock,
} = vi.hoisted(() => ({
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

describe("consultant access contracts", () => {
  const sessionUser = {
    id: "user_consultant",
    email: "review.consultant@pat.local",
    role: "MEMBER",
    companyId: null,
  } as const;

  beforeEach(() => {
    findUniqueMock.mockReset();
    matchesPrismaMissingSchemaTargetMock.mockReset();
    warnPrismaCompatibilityOnceMock.mockReset();
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "0");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("resolves active ecosystem-scoped consultant assignments from the existing PAT user account", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
    // Phase 3 / Day-12 (closes AUDIT-D10-002): ConsultantAssignment is strict
    // 1:1 (singleton, not array) and points at an Ecosystem whose VendorCompany
    // + EcosystemFirm rows yield the full ecosystem reach the consultant has.
    // Return shape is plural (ecosystems[]) so post-pilot N:M scales without
    // another shape migration.
    findUniqueMock.mockResolvedValue({
      id: "consultant_profile_1",
      active: true,
      User: {
        name: "Consultant Review",
        email: "review.consultant@pat.local",
      },
      ConsultantAssignment: {
        id: "assignment_1",
        ecosystemId: "ecosystem_1",
        Ecosystem: {
          id: "ecosystem_1",
          name: "Acme Holdings",
          vendorCompanyId: "vendor_acme",
          VendorCompany: {
            id: "vendor_acme",
            name: "Acme Vendor Co",
          },
          EcosystemFirm: [
            {
              firmCompanyId: "company_assigned",
              FirmCompany: {
                id: "company_assigned",
                name: "Assigned Firm",
                type: "FIRM",
              },
            },
          ],
        },
      },
    });

    const result = await getConsultantAccessStateForUser(sessionUser);

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { userId: "user_consultant" },
      select: expect.objectContaining({
        active: true,
        ConsultantAssignment: expect.objectContaining({
          where: { active: true },
          select: expect.objectContaining({
            Ecosystem: expect.objectContaining({
              select: expect.objectContaining({
                VendorCompany: expect.objectContaining({
                  select: { id: true, name: true },
                }),
                EcosystemFirm: expect.objectContaining({
                  select: expect.objectContaining({
                    FirmCompany: expect.objectContaining({
                      select: { id: true, name: true, type: true },
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      }),
    });
    expect(result).toEqual({
      sessionUser,
      consultantProfileId: "consultant_profile_1",
      consultantLabel: "Consultant Review",
      ecosystems: [
        {
          assignmentId: "assignment_1",
          ecosystemId: "ecosystem_1",
          ecosystemName: "Acme Holdings",
          vendorCompanyId: "vendor_acme",
          vendorCompanyName: "Acme Vendor Co",
          firmCompanies: [{ id: "company_assigned", name: "Assigned Firm" }],
        },
      ],
    });
  });

  it("returns an empty ecosystems[] when the assignment exists but the ecosystem has no vendor", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
    // Defensive case: an Ecosystem with vendorCompanyId=null shouldn't render
    // a card. Skipping at the access layer keeps the UI fail-closed.
    findUniqueMock.mockResolvedValue({
      id: "consultant_profile_1",
      active: true,
      User: { name: null, email: "review.consultant@pat.local" },
      ConsultantAssignment: {
        id: "assignment_orphan",
        ecosystemId: "ecosystem_orphan",
        Ecosystem: {
          id: "ecosystem_orphan",
          name: "Solo Orphan",
          vendorCompanyId: null,
          VendorCompany: null,
          EcosystemFirm: [],
        },
      },
    });

    const result = await getConsultantAccessStateForUser(sessionUser);
    expect(result?.ecosystems).toEqual([]);
  });

  it("returns null when the PAT user account has no active consultant profile", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
    findUniqueMock.mockResolvedValue({
      id: "consultant_profile_1",
      active: false,
      User: {
        name: null,
        email: "review.consultant@pat.local",
      },
      ConsultantAssignment: null,
    });

    await expect(getConsultantAccessStateForUser(sessionUser)).resolves.toBeNull();
  });

  it("falls back safely when consultant tables are missing locally", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "1");
    const missingSchemaError = new Error("consultantprofile relation is missing");
    findUniqueMock.mockRejectedValue(missingSchemaError);
    matchesPrismaMissingSchemaTargetMock.mockReturnValue(true);

    await expect(getConsultantAccessStateForUser(sessionUser)).resolves.toBeNull();
    expect(matchesPrismaMissingSchemaTargetMock).toHaveBeenCalledWith(missingSchemaError, [
      "consultantprofile",
      "consultantassignment",
    ]);
    expect(warnPrismaCompatibilityOnceMock).toHaveBeenCalledWith(
      "consultant-access-missing",
      "Consultant access tables are missing locally. Apply the latest Prisma migrations before using the consultant sign-in and briefing routes."
    );
  });

  it("returns null without querying consultant tables when consultant access is gated off", async () => {
    vi.stubEnv(CONSULTANT_ACCESS_FLAG_ENV, "0");
    await expect(getConsultantAccessStateForUser(sessionUser)).resolves.toBeNull();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });
});
