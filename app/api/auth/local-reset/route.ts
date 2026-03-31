import { NextResponse, type NextRequest } from "next/server";
import { clearLocalAuthCookies } from "@/lib/auth/cookies";

function sanitizeRedirect(target: string | null) {
  if (!target || !target.startsWith("/")) {
    return "/login";
  }

  return target;
}

function buildRedirectUrl(request: NextRequest, target: string) {
  const url = new URL(target, request.url);
  url.searchParams.set("authReset", "1");
  return url;
}

function buildResetResponse(request: NextRequest, redirectTarget: string, reason: string | null) {
  const url = buildRedirectUrl(request, redirectTarget);
  if (reason) {
    url.searchParams.set("authResetReason", reason);
  }

  const response = NextResponse.redirect(url);
  clearLocalAuthCookies(response.cookies);
  return response;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const redirectTo = sanitizeRedirect(
    typeof formData?.get("redirectTo") === "string" ? String(formData.get("redirectTo")) : "/login"
  );
  const reason = typeof formData?.get("reason") === "string" ? String(formData.get("reason")) : null;

  return buildResetResponse(request, redirectTo, reason);
}

export async function GET(request: NextRequest) {
  const redirectTo = sanitizeRedirect(request.nextUrl.searchParams.get("redirectTo"));
  const reason = request.nextUrl.searchParams.get("reason");
  return buildResetResponse(request, redirectTo, reason);
}
