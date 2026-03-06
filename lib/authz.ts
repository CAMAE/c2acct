import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";

type AuthzUser = {
  role: UserRole;
  companyId: string | null;
};

export function isAdminRole(role: UserRole | null | undefined) {
  return role === "ADMIN" || role === "OWNER";
}

export function hasCompany(user: Pick<AuthzUser, "companyId"> | null | undefined) {
  return Boolean(user?.companyId);
}

export function canAccessCompany(
  user: AuthzUser | null | undefined,
  targetCompanyId: string | null | undefined
) {
  if (!user?.companyId || !targetCompanyId) return false;
  return user.companyId === targetCompanyId;
}

export function unauthorizedResponse(error = "Unauthorized") {
  return NextResponse.json({ ok: false, error }, { status: 401 });
}

export function forbiddenResponse(error = "Forbidden") {
  return NextResponse.json({ ok: false, error }, { status: 403 });
}
