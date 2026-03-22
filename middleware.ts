import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PROTECTED_API_PREFIXES = [
  "/api/results",
  "/api/badges/earned",
  "/api/insights/unlocked",
  "/api/survey/submit",
  "/api/company/select",
  "/api/company/default",
];

function isProtectedApiPath(pathname: string) {
  return PROTECTED_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export default auth((req) => {
  const isAuthenticated = Boolean(req.auth?.user);
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/admin") && !isAuthenticated) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedApiPath(pathname) && !isAuthenticated) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/results",
    "/api/badges/earned",
    "/api/insights/unlocked",
    "/api/survey/submit",
    "/api/company/select",
    "/api/company/default",
  ],
};
