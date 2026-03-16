import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { resolveVisibilityContext, listVisibleProducts } from "@/lib/visibility";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function isEnabled(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  try {
    const requestUrl = new URL(req.url);
    const includeSponsoredProducts = isEnabled(requestUrl.searchParams.get("includeSponsored"));
    const preferredCompanyId = await resolvePreferredViewerCompanyId(requestUrl.searchParams);
    const visibilityContext = await resolveVisibilityContext({
      sessionUser,
      preferredCompanyId,
    });

    if (!visibilityContext?.currentCompany) {
      return forbiddenResponse("No company assigned");
    }

    const company = visibilityContext.currentCompany;
    if (company.type === "FIRM" && includeSponsoredProducts) {
      const products = await listVisibleProducts({
        sessionUser,
        preferredCompanyId,
        includeSponsoredProducts: true,
      });

      return NextResponse.json(
        {
          ok: true,
          companyId: company.id,
          companyType: company.type,
          enableProductSelection: products.length > 0,
          products: products.map((product) => ({
            id: product.id,
            name: product.name,
            companyId: product.companyId,
            accessReason: product.accessReason,
          })),
        },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (company.type !== "VENDOR") {
      return NextResponse.json(
        { ok: true, companyId: company.id, companyType: company.type, enableProductSelection: false, products: [] },
        { headers: NO_STORE_HEADERS }
      );
    }

    const products = await listVisibleProducts({
      sessionUser,
      preferredCompanyId,
      includeSponsoredProducts: false,
    });

    return NextResponse.json(
      {
        ok: true,
        companyId: company.id,
        companyType: company.type,
        enableProductSelection: products.length > 0,
        products: products.map((product) => ({
          id: product.id,
          name: product.name,
          companyId: product.companyId,
          accessReason: product.accessReason,
        })),
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load product context" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
