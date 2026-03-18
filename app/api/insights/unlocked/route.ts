import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { evaluateUnlockedInsights } from "@/lib/engine/evaluateInsightUnlocks";
import { resolveVisibleSubject } from "@/lib/visibility";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const requestUrl = new URL(req.url);
  const requestedCompanyId = requestUrl.searchParams.get("companyId")?.trim() ?? "";
  const requestedProductId = requestUrl.searchParams.get("productId")?.trim() ?? "";
  const preferredCompanyId = await resolvePreferredViewerCompanyId(requestUrl.searchParams);
  const visibleSubject = await resolveVisibleSubject({
    sessionUser,
    preferredCompanyId,
    requestedCompanyId,
    requestedProductId,
    includeSponsoredProducts: true,
  });

  if (!visibleSubject.ok) {
    return NextResponse.json(
      { ok: false, error: visibleSubject.error },
      { status: visibleSubject.status, headers: NO_STORE_HEADERS }
    );
  }

  const companyId = visibleSubject.subject.company.id;
  const targetProductId = visibleSubject.subject.product?.id ?? null;

  try {
    const evaluation = await evaluateUnlockedInsights({
      companyId,
      productId: targetProductId,
    });

    return NextResponse.json(
      { ok: true, unlocked: evaluation.unlocked },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load unlocked insights" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
