import type { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { buildProtectedSignInRedirectPath } from "@/lib/auth/routes";
import type { AssessmentSubjectContext } from "@/lib/subjectContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

const PROTECTED_PAT_PAGE_PREFIXES = [
  "/admin",
  "/platform",
  "/survey",
  "/results",
  "/outputs",
  "/profiles",
  "/firm",
  "/vendor",
  "/user",
  "/consultants",
] as const;

const PROTECTED_PAT_API_PREFIXES = [
  "/api/results",
  "/api/insights/unlocked",
  "/api/badges/earned",
  "/api/survey/module",
  "/api/survey/draft",
  "/api/survey/submit",
  "/api/firm/product-assessment/submit",
  "/api/vendor/product-assessment/submit",
] as const;

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

/**
 * pattern box A (R60, change 7; Forge finding 10/05): the two membership pages are
 * SALES surfaces — they already render the signed-out tier grid — so a signed-out
 * GET passes the proxy instead of bouncing to sign-in. Exact paths only: checkout
 * and every other /vendor or /firm route stay protected. There is no enterprise
 * membership page (app/(app)/enterprise has none), so nothing to allow there.
 */
export const SIGNED_OUT_SALES_PAGE_PATHS = ["/vendor/membership", "/firm/membership"] as const;

export function isSignedOutSalesPage(pathname: string, method: string) {
  return method.toUpperCase() === "GET" && (SIGNED_OUT_SALES_PAGE_PATHS as readonly string[]).includes(pathname);
}

export function isProtectedPatPagePath(pathname: string, method = "GET") {
  if (isSignedOutSalesPage(pathname, method)) return false;
  return PROTECTED_PAT_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function isProtectedPatApiPath(pathname: string) {
  return PROTECTED_PAT_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function buildSignInRedirectPath(input: {
  pathname: string;
  search?: string;
}) {
  return buildProtectedSignInRedirectPath(input);
}
