import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolveViewerContext, viewerCanAccessCompany } from "@/lib/viewerContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const viewerContext = await resolveViewerContext({ sessionUser });
  if (!viewerContext?.defaultCompanyId) {
    return forbiddenResponse("No company assigned");
  }

  const cookieStore = await cookies();
  const existing = cookieStore.get("aae_companyId")?.value;

  if (existing && viewerCanAccessCompany(viewerContext, existing)) {
    return NextResponse.json(
      { ok: true, companyId: null, alreadySelected: true },
      { headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    { ok: true, companyId: viewerContext.defaultCompanyId },
    { headers: NO_STORE_HEADERS }
  );
}
