import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { createMembershipCustomerPortalSession } from "@/lib/billing/portal";
import type { MembershipAudience } from "@/lib/membershipContext";

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
  const result = await createMembershipCustomerPortalSession({
    sessionUser,
    audience,
    returnPath,
  });

  if (result.ok && result.redirectUrl) {
    return NextResponse.redirect(result.redirectUrl, 303);
  }

  const redirectUrl = new URL(result.returnPath, request.url);
  redirectUrl.searchParams.set("portal", result.mode === "scaffold" ? "scaffold" : "unavailable");
  redirectUrl.searchParams.set("reason", result.reason ?? "unknown");

  return NextResponse.redirect(redirectUrl, 303);
}
