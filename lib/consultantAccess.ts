import { redirect } from "next/navigation";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  matchesPrismaMissingSchemaTarget,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";

export const CONSULTANT_ACCESS_FLAG_ENV = "PAT_ENABLE_CONSULTANT_ACCESS";

export type ConsultantAssignmentScope = {
  assignmentId: string;
  companyId: string;
  companyName: string;
};

export type ConsultantAccessState = {
  sessionUser: SessionUser;
  consultantProfileId: string;
  consultantLabel: string;
  assignments: ConsultantAssignmentScope[];
};

export function isConsultantAccessEnabled() {
  return process.env[CONSULTANT_ACCESS_FLAG_ENV] === "1";
}

export async function getConsultantAccessStateForUser(
  sessionUser: SessionUser | null
): Promise<ConsultantAccessState | null> {
  if (!sessionUser || !isConsultantAccessEnabled()) {
    return null;
  }

  try {
    const consultantProfile = await prisma.consultantProfile.findUnique({
      where: { userId: sessionUser.id },
      select: {
        id: true,
        active: true,
        User: {
          select: {
            name: true,
            email: true,
          },
        },
        ConsultantAssignment: {
          where: { active: true },
          select: {
            id: true,
            ecosystemId: true,
            Ecosystem: {
              select: {
                EcosystemFirm: {
                  select: {
                    firmCompanyId: true,
                    FirmCompany: {
                      select: { id: true, name: true, type: true },
                    },
                  },
                  orderBy: { FirmCompany: { name: "asc" } },
                },
              },
            },
          },
        },
      },
    });

    if (!consultantProfile?.active) {
      return null;
    }

    // Strict 1:1 (Phase 1 / Day-10) means at most one ConsultantAssignment per profile.
    // The legacy ConsultantAssignmentScope[] shape (one row per firm) is reconstructed
    // by walking ecosystem -> firms; the assignmentId is shared across the row set
    // because there's still only one underlying assignment. Phase 6 (consultantAccess.ts
    // full rewrite) replaces this shim with an explicit ConsultantEcosystemView return.
    const assignment = consultantProfile.ConsultantAssignment;
    const firmMemberships = assignment?.Ecosystem?.EcosystemFirm ?? [];
    const assignments = assignment
      ? firmMemberships
          .filter((membership) => membership.FirmCompany.type === "FIRM")
          .map((membership) => ({
            assignmentId: assignment.id,
            companyId: membership.FirmCompany.id,
            companyName: membership.FirmCompany.name,
          }))
      : [];

    return {
      sessionUser,
      consultantProfileId: consultantProfile.id,
      consultantLabel: consultantProfile.User.name?.trim() || consultantProfile.User.email,
      assignments,
    };
  } catch (error) {
    if (
      matchesPrismaMissingSchemaTarget(error, [
        "consultantprofile",
        "consultantassignment",
      ])
    ) {
      warnPrismaCompatibilityOnce(
        "consultant-access-missing",
        "Consultant access tables are missing locally. Apply the latest Prisma migrations before using the consultant sign-in and briefing routes."
      );
      return null;
    }

    throw error;
  }
}

export async function requireConsultantSession(callbackUrl = "/consultants") {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(buildCanonicalSignInPath({ callbackUrl, view: "consultant" }));
  }

  return getConsultantAccessStateForUser(sessionUser);
}

export async function requireConsultantCompanyAccess(
  companyId: string,
  callbackUrl: string
) {
  const consultantAccess = await requireConsultantSession(callbackUrl);
  if (!consultantAccess) {
    return null;
  }

  return consultantAccess.assignments.some((assignment) => assignment.companyId === companyId)
    ? consultantAccess
    : null;
}
