import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createMembershipCustomerPortalSession } from "@/lib/billing/portal";
import type { MembershipAudience } from "@/lib/membershipContext";
import { ELEVATED_ACTION, hasElevatedConfirmation } from "@/lib/security/elevatedAction";
import { consumeDurableRateLimit, getClientIp, rateLimitJsonResponse } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseAudience(value: FormDataEntryValue | null): MembershipAudience {
  if (value === "vendor" || value === "firm" || value === "individual") {
    return value;
  }

  return "individual";
}

function parseReturnPath(value: FormDataEntryValue | null, audience: MembershipAudience) {
  const fallback = audience === "individual" ? "/user/membership" : `/${audience}/membership`;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export async function POST(request: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, reason: "unauthenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const audience = parseAudience(formData.get("audience"));
  const returnPath = parseReturnPath(formData.get("returnTo"), audience);
  const redirectUrl = new URL(returnPath, request.url);

  if (!hasElevatedConfirmation(formData, ELEVATED_ACTION.BILLING_PORTAL)) {
    redirectUrl.searchParams.set("portal", "unavailable");
    redirectUrl.searchParams.set("reason", "confirmation_required");
    return NextResponse.redirect(redirectUrl, 303);
  }

  const quota = await consumeDurableRateLimit({
    scope: "billing.portal",
    key: `${sessionUser.id}:${getClientIp(request)}`,
    limit: 6,
    windowMs: 60_000,
  });

  if (!quota.allowed) {
    return rateLimitJsonResponse(quota);
  }

  const result = await createMembershipCustomerPortalSession({
    sessionUser,
    audience,
    returnPath,
  });

  if (result.ok && result.redirectUrl) {
    return NextResponse.redirect(result.redirectUrl, 303);
  }

  const fallbackUrl = new URL(result.returnPath, request.url);
  fallbackUrl.searchParams.set("portal", result.mode === "scaffold" ? "scaffold" : "unavailable");
  fallbackUrl.searchParams.set("reason", result.reason ?? "unknown");

  return NextResponse.redirect(fallbackUrl, 303);
}
