import type { MembershipStatus, PlatformRole, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

type SessionViewerSeed = {
  id: string;
  role: UserRole;
  companyId: string | null;
  platformRole: PlatformRole;
};

type ResolveViewerCompanyScopeInput = {
  memberships: ViewerMembership[];
  platformRole: PlatformRole;
  legacyCompanyId?: string | null;
  preferredCompanyId?: string | null;
};

export type ViewerMembership = {
  companyId: string;
  role: UserRole;
  status: MembershipStatus;
};

export type ViewerContext = {
  userId: string;
  platformRole: PlatformRole;
  memberships: ViewerMembership[];
  defaultCompanyId: string | null;
  currentCompanyId: string | null;
};

function normalizeOptionalCompanyId(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isElevatedPlatformRole(platformRole: PlatformRole): boolean {
  return platformRole === "PLATFORM_ADMIN" || platformRole === "PLATFORM_OWNER";
}

export function resolveViewerCompanyScope(input: ResolveViewerCompanyScopeInput) {
  const memberships = input.memberships;
  const legacyCompanyId = normalizeOptionalCompanyId(input.legacyCompanyId);
  const preferredCompanyId = normalizeOptionalCompanyId(input.preferredCompanyId);

  const defaultCompanyId =
    legacyCompanyId && memberships.some((membership) => membership.companyId === legacyCompanyId)
      ? legacyCompanyId
      : memberships[0]?.companyId ?? legacyCompanyId ?? null;

  const currentCompanyId =
    preferredCompanyId &&
    viewerCanAccessCompany({ memberships, platformRole: input.platformRole }, preferredCompanyId)
      ? preferredCompanyId
      : defaultCompanyId;

  return {
    defaultCompanyId,
    currentCompanyId,
  };
}

export function viewerCanAccessCompany(
  viewerContext: Pick<ViewerContext, "memberships" | "platformRole">,
  companyId: string | null | undefined
) {
  const normalizedCompanyId = normalizeOptionalCompanyId(companyId);
  if (!normalizedCompanyId) {
    return false;
  }

  if (isElevatedPlatformRole(viewerContext.platformRole)) {
    return true;
  }

  return viewerContext.memberships.some((membership) => membership.companyId === normalizedCompanyId);
}

export async function resolveViewerContext(input: {
  sessionUser: SessionViewerSeed | null | undefined;
  preferredCompanyId?: string | null;
}): Promise<ViewerContext | null> {
  const sessionUser = input.sessionUser;
  if (!sessionUser?.id) {
    return null;
  }

  const legacyCompanyId = normalizeOptionalCompanyId(sessionUser.companyId);

  const membershipRows = await prisma.companyMembership.findMany({
    where: {
      userId: sessionUser.id,
      status: "ACTIVE",
    },
    select: {
      companyId: true,
      role: true,
      status: true,
    },
    orderBy: [{ createdAt: "asc" }, { companyId: "asc" }],
  });

  const memberships =
    membershipRows.length > 0
      ? membershipRows
      : legacyCompanyId
        ? [
            {
              companyId: legacyCompanyId,
              role: sessionUser.role,
              status: "ACTIVE" as const,
            },
          ]
        : [];

  const { defaultCompanyId, currentCompanyId } = resolveViewerCompanyScope({
    memberships,
    platformRole: sessionUser.platformRole,
    legacyCompanyId,
    preferredCompanyId: input.preferredCompanyId,
  });

  return {
    userId: sessionUser.id,
    platformRole: sessionUser.platformRole,
    memberships,
    defaultCompanyId,
    currentCompanyId,
  };
}

export function applyViewerCompanyScopeToSessionUser<T extends SessionViewerSeed>(
  sessionUser: T,
  viewerContext: Pick<ViewerContext, "currentCompanyId">
): T {
  return {
    ...sessionUser,
    companyId: viewerContext.currentCompanyId,
  };
}
