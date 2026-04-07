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
          where: {
            active: true,
            Company: { type: "FIRM" },
          },
          orderBy: {
            Company: { name: "asc" },
          },
          select: {
            id: true,
            companyId: true,
            Company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!consultantProfile?.active) {
      return null;
    }

    return {
      sessionUser,
      consultantProfileId: consultantProfile.id,
      consultantLabel: consultantProfile.User.name?.trim() || consultantProfile.User.email,
      assignments: consultantProfile.ConsultantAssignment.map((assignment) => ({
        assignmentId: assignment.id,
        companyId: assignment.companyId,
        companyName: assignment.Company.name,
      })),
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
