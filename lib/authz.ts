import type { PlatformRole, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type AuthzUser = {
  role: UserRole;
  platformRole?: PlatformRole;
  companyId: string | null;
  memberships?: Array<{ companyId: string }>;
};

export function isAdminRole(role: UserRole | null | undefined) {
  return role === "ADMIN" || role === "OWNER";
}

export function isTenantAdmin(user: Pick<AuthzUser, "role"> | null | undefined) {
  return isAdminRole(user?.role);
}

export function hasCompany(user: Pick<AuthzUser, "companyId"> | null | undefined) {
  return Boolean(user?.companyId);
}

export function isPlatformOperator(platformRole: PlatformRole | null | undefined) {
  return platformRole === "PLATFORM_ADMIN" || platformRole === "PLATFORM_OWNER";
}

export function isPlatformAdmin(user: Pick<AuthzUser, "platformRole"> | null | undefined) {
  return isPlatformOperator(user?.platformRole);
}

export function canAccessCompany(
  user: AuthzUser | null | undefined,
  targetCompanyId: string | null | undefined
) {
  if (!targetCompanyId) return false;
  if (isPlatformOperator(user?.platformRole)) return true;
  if (user?.memberships && user.memberships.length > 0) {
    return user.memberships.some((membership) => membership.companyId === targetCompanyId);
  }
  if (!user?.companyId) return false;
  return user.companyId === targetCompanyId;
}

export function unauthorizedResponse(error = "Unauthorized") {
  return NextResponse.json({ ok: false, error }, { status: 401, headers: NO_STORE_HEADERS });
}

export function forbiddenResponse(error = "Forbidden") {
  return NextResponse.json({ ok: false, error }, { status: 403, headers: NO_STORE_HEADERS });
}
