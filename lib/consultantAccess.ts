import { redirect } from "next/navigation";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import {
  matchesPrismaMissingSchemaTarget,
  warnPrismaCompatibilityOnce,
} from "@/lib/prisma-compat";

export const CONSULTANT_ACCESS_FLAG_ENV = "PAT_ENABLE_CONSULTANT_ACCESS";

/**
 * Ecosystem-shaped consultant scope (Phase 3 / Day-12; closes AUDIT-D10-002).
 *
 * Each scope describes one ConsultantAssignment's full ecosystem reach:
 * the vendor company on the vendor side, plus the set of firm companies on
 * the firm side. Used by /consultants Mock C list view and by the
 * requireConsultantCompanyAccess gate which now permits both vendor-side
 * and firm-side company IDs (right shape for Phase 4 drill-down routes).
 */
export type ConsultantEcosystemScope = {
  assignmentId: string;
  ecosystemId: string;
  ecosystemName: string;
  vendorCompanyId: string;
  vendorCompanyName: string;
  firmCompanies: { id: string; name: string }[];
};

/**
 * @deprecated Use {@link ConsultantEcosystemScope}. Retained as an exported
 * type alias for one release cycle for any external consumer that imported
 * the Day-10 shim shape; no internal code references it. Removed in PAT 5.8.
 */
export type ConsultantAssignmentScope = {
  assignmentId: string;
  companyId: string;
  companyName: string;
};

export type ConsultantAccessState = {
  sessionUser: SessionUser;
  consultantProfileId: string;
  consultantLabel: string;
  ecosystems: ConsultantEcosystemScope[];
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
                id: true,
                name: true,
                vendorCompanyId: true,
                VendorCompany: {
                  select: { id: true, name: true },
                },
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

    // Strict 1:1 in Phase 1 (one ConsultantAssignment per profile), but the
    // return shape is plural so Phase 4+ can scale to N:M without another
    // shape migration.
    const assignment = consultantProfile.ConsultantAssignment;
    const ecosystem = assignment?.Ecosystem ?? null;
    const ecosystems: ConsultantEcosystemScope[] = [];
    if (
      assignment &&
      ecosystem &&
      ecosystem.vendorCompanyId &&
      ecosystem.VendorCompany
    ) {
      ecosystems.push({
        assignmentId: assignment.id,
        ecosystemId: ecosystem.id,
        ecosystemName: ecosystem.name,
        vendorCompanyId: ecosystem.vendorCompanyId,
        vendorCompanyName: ecosystem.VendorCompany.name,
        firmCompanies: ecosystem.EcosystemFirm.filter(
          (membership) => membership.FirmCompany.type === "FIRM"
        ).map((membership) => ({
          id: membership.FirmCompany.id,
          name: membership.FirmCompany.name,
        })),
      });
    }

    return {
      sessionUser,
      consultantProfileId: consultantProfile.id,
      consultantLabel: consultantProfile.User.name?.trim() || consultantProfile.User.email,
      ecosystems,
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

  const allowed = consultantAccess.ecosystems.some(
    (scope) =>
      scope.vendorCompanyId === companyId ||
      scope.firmCompanies.some((firm) => firm.id === companyId)
  );

  return allowed ? consultantAccess : null;
}
