import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  buildSignInRedirectPath,
  isProtectedPatApiPath,
  isProtectedPatPagePath,
  unauthorizedResponse,
} from "@/lib/authz";
import { getResolvedAuthSecret } from "@/lib/auth/env";

const resolvedAuthSecret = getResolvedAuthSecret();

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtectedPage = isProtectedPatPagePath(pathname);
  const isProtectedApi = isProtectedPatApiPath(pathname);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: resolvedAuthSecret ?? undefined,
  }).catch(() => null);

  if (token?.sub) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return unauthorizedResponse();
  }

  const signInPath = buildSignInRedirectPath({
    pathname,
    search: req.nextUrl.search,
  });
  return NextResponse.redirect(new URL(signInPath, req.nextUrl));
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/platform/:path*",
    "/survey/:path*",
    "/results/:path*",
    "/outputs/:path*",
    "/profiles/:path*",
    "/firm/:path*",
    "/vendor/:path*",
    "/user/:path*",
    "/api/results/:path*",
    "/api/insights/unlocked/:path*",
    "/api/badges/earned/:path*",
    "/api/survey/module/:path*",
    "/api/survey/draft/:path*",
    "/api/survey/submit/:path*",
    "/api/firm/product-assessment/submit/:path*",
    "/api/vendor/product-assessment/submit/:path*",
  ],
};
