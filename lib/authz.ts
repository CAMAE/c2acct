import { NextResponse } from "next/server";
import type { SessionUser, SessionUserRole } from "@/lib/auth/session";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

type AuthzUser = {
  role: SessionUserRole;
  companyId: string | null;
};

export function isAdminRole(role: SessionUserRole | null | undefined) {
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
  return NextResponse.json({ ok: false, error }, { status: 401, headers: NO_STORE_HEADERS });
}

export function forbiddenResponse(error = "Forbidden") {
  return NextResponse.json({ ok: false, error }, { status: 403, headers: NO_STORE_HEADERS });
}

export function resolveAuthorizedCompanyId(
  user: SessionUser | null | undefined,
  requestedCompanyId: string | null | undefined
) {
  if (!user) {
    return { ok: false as const, response: unauthorizedResponse() };
  }

  if (!user.companyId) {
    return { ok: false as const, response: forbiddenResponse("No company assigned") };
  }

  if (!requestedCompanyId) {
    return { ok: true as const, companyId: user.companyId };
  }

  if (!canAccessCompany(user, requestedCompanyId)) {
    return { ok: false as const, response: forbiddenResponse("Cross-company access denied") };
  }

  return { ok: true as const, companyId: requestedCompanyId };
}
