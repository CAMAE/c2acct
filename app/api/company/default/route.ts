import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, hasCompany, unauthorizedResponse } from "@/lib/authz";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  if (!hasCompany(sessionUser)) {
    return forbiddenResponse("No company assigned");
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get("aae_companyId")?.value;

  // If already selected, don't trigger client auto-select/reload loop
  if (existing && existing === sessionUser.companyId) {
    return NextResponse.json(
      { ok: true, companyId: null, alreadySelected: true },
      { headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json({ ok: true, companyId: sessionUser.companyId }, { headers: NO_STORE_HEADERS });
}
