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
    // Phase 1 / Day-10: ConsultantAssignment is strict-1:1 (singleton, not array)
    // and points at an Ecosystem whose EcosystemFirm rows yield the firm-companies
    // the consultant can see. The legacy ConsultantAssignmentScope[] return shape
    // is preserved by walking ecosystem -> firms; assignmentId is shared because
    // there's only one underlying assignment.
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
      assignments: [
        {
          assignmentId: "assignment_1",
          companyId: "company_assigned",
          companyName: "Assigned Firm",
        },
      ],
    });
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
