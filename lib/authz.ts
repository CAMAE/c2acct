import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import type { AssessmentSubjectContext } from "@/lib/subjectContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

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

export function hasAssessmentSubject(
  context: AssessmentSubjectContext | null | undefined
) {
  return Boolean(context?.subjectId || context?.companyId);
}

export function hasCompanyBackedAssessmentSubject(
  context: AssessmentSubjectContext | null | undefined
) {
  return Boolean(context?.companyId);
}

export function canAccessPortalAdmin(user: Pick<AuthzUser, "role"> | null | undefined) {
  return isAdminRole(user?.role);
}

export function unauthorizedResponse(error = "Unauthorized") {
  return NextResponse.json({ ok: false, error }, { status: 401, headers: NO_STORE_HEADERS });
}

export function forbiddenResponse(error = "Forbidden") {
  return NextResponse.json({ ok: false, error }, { status: 403, headers: NO_STORE_HEADERS });
}
