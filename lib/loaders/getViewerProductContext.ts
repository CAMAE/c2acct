import { getSessionUser } from "@/lib/auth/session";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { listVisibleProducts, resolveVisibilityContext } from "@/lib/visibility";

export type ViewerProductContextData =
  | {
      kind: "unauthorized";
    }
  | {
      kind: "forbidden";
    }
  | {
      kind: "ok";
      companyId: string;
      companyType: "FIRM" | "VENDOR";
      enableProductSelection: boolean;
      products: Array<{
        id: string;
        name: string;
        companyId: string;
        accessReason: "OWNED" | "SPONSORED";
      }>;
    };

export async function getViewerProductContextData(input?: {
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
  includeSponsoredProducts?: boolean;
}): Promise<ViewerProductContextData> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { kind: "unauthorized" };
  }

  const preferredCompanyId = await resolvePreferredViewerCompanyId(input?.searchParams);
  const visibilityContext = await resolveVisibilityContext({
    sessionUser,
    preferredCompanyId,
  });

  if (!visibilityContext?.currentCompany) {
    return { kind: "forbidden" };
  }

  const company = visibilityContext.currentCompany;
  const includeSponsoredProducts =
    input?.includeSponsoredProducts === true && company.type === "FIRM";

  const products =
    company.type !== "VENDOR" && !includeSponsoredProducts
      ? []
      : await listVisibleProducts({
          sessionUser,
          preferredCompanyId,
          includeSponsoredProducts,
        });

  return {
    kind: "ok",
    companyId: company.id,
    companyType: company.type,
    enableProductSelection: products.length > 0,
    products,
  };
}
