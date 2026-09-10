import { NextResponse, type NextRequest } from "next/server";
import { auth, unstable_update } from "@/auth";

/**
 * Re-read the signed-in user's DB claims into the session cookie, then return
 * to `returnTo` (same-origin path only). Wait-state box item 1 (2026-09-10):
 * the password-update page sends a session here when its JWT still says
 * `mustChangePassword` but the DB row says the update is done, so the
 * middleware stops bouncing protected pages back to the form. The jwt callback
 * in auth.ts already re-reads the user row on every update, so no claim is
 * written here by hand — the DB is the only source.
 */
export const dynamic = "force-dynamic";

function sanitizeReturnTo(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export async function GET(request: NextRequest) {
  const returnTo = sanitizeReturnTo(request.nextUrl.searchParams.get("returnTo"));
  const session = await auth();
  if (!session?.user) {
    return relativeRedirect(`/sign-in?callbackUrl=${encodeURIComponent(returnTo)}`);
  }
  await unstable_update({});
  return relativeRedirect(returnTo);
}

/**
 * A relative Location keeps the browser on the host it arrived from. Behind
 * the standalone server request.nextUrl resolves to the internal hostname
 * (localhost), which would send the cookie-bearing session to a host it has
 * no cookie for.
 */
function relativeRedirect(location: string) {
  return new NextResponse(null, { status: 307, headers: { Location: location } });
}
