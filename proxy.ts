import { NextResponse, type NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import {
  buildSignInRedirectPath,
  isProtectedPatApiPath,
  isProtectedPatPagePath,
  unauthorizedResponse,
} from "@/lib/authz";
import { getResolvedAuthSecret } from "@/lib/auth/env";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/observability/requestId";

const resolvedAuthSecret = getResolvedAuthSecret();

export default async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const isProtectedPage = isProtectedPatPagePath(pathname);
  const isProtectedApi = isProtectedPatApiPath(pathname);

  // Correlation id, minted once per request and attached BEFORE any branch
  // below — including the unprotected early return — so every request is
  // traceable, not just authenticated ones. An error on a public page is
  // exactly the kind you get reported by a stranger with no other context.
  const requestId = resolveRequestId(req.headers);
  const withRequestId = (response: NextResponse) => {
    response.headers.set(REQUEST_ID_HEADER, requestId);
    return response;
  };
  const forwardHeaders = () => {
    const headers = new Headers(req.headers);
    headers.set(REQUEST_ID_HEADER, requestId);
    return headers;
  };

  if (!isProtectedPage && !isProtectedApi) {
    return withRequestId(NextResponse.next({ request: { headers: forwardHeaders() } }));
  }

  // Auth.js v5 names the session cookie `__Secure-authjs.session-token` under
  // https and derives the JWE encryption salt from that exact name. getToken
  // must be told the cookie is secure, otherwise it looks for the non-secure
  // `authjs.session-token` with the wrong salt, fails to decode, and returns
  // null — which bounces every authenticated user back to /sign-in (the prod
  // "sign in, land on /vendor, but see the sign-in form" loop). Derive secure
  // from the request protocol / forwarded proto (Vercel + Cloudflare both set
  // https for the deployed origin); locally over http this stays false so the
  // non-secure cookie name + salt are used.
  const secureCookie =
    req.nextUrl.protocol === "https:" ||
    req.headers.get("x-forwarded-proto") === "https";
  const token = await getToken({
    req,
    secret: resolvedAuthSecret ?? undefined,
    secureCookie,
  }).catch(() => null);

  if (token?.sub) {
    if (isProtectedPage && token.mustChangePassword === true) {
      const returnTo = `${pathname}${req.nextUrl.search}`;
      const passwordUpdateUrl = new URL("/sign-in/password-update", req.nextUrl);
      passwordUpdateUrl.searchParams.set("returnTo", returnTo);
      return withRequestId(NextResponse.redirect(passwordUpdateUrl));
    }

    // Server components cannot read the request path; the /admin layout reads
    // x-pathname to highlight the active nav tab.
    const requestHeaders = forwardHeaders();
    requestHeaders.set("x-pathname", pathname);
    return withRequestId(NextResponse.next({ request: { headers: requestHeaders } }));
  }

  if (isProtectedApi) {
    return withRequestId(unauthorizedResponse());
  }

  const signInPath = buildSignInRedirectPath({
    pathname,
    search: req.nextUrl.search,
  });
  return withRequestId(NextResponse.redirect(new URL(signInPath, req.nextUrl)));
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
    "/consultants/:path*",
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
