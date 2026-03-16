import { getSessionUser } from "@/lib/auth/session";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { listVisibleProducts, resolveVisibilityContext } from "@/lib/visibility";

export type VisibleProductCatalogEntry = {
  id: string;
  name: string;
  companyId: string;
  accessReason: "OWNED" | "SPONSORED";
};

export type VisibleProductCatalogForViewer = {
  currentCompany: {
    id: string;
    name: string;
    type: "FIRM" | "VENDOR";
  } | null;
  products: VisibleProductCatalogEntry[];
};

export async function getVisibleProductCatalogForViewer(input?: {
  searchParams?: URLSearchParams | Record<string, string | string[] | undefined>;
  includeSponsoredProducts?: boolean;
}) : Promise<VisibleProductCatalogForViewer | null> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }

  const preferredCompanyId = await resolvePreferredViewerCompanyId(input?.searchParams);
  const visibilityContext = await resolveVisibilityContext({
    sessionUser,
    preferredCompanyId,
  });

  if (!visibilityContext) {
    return null;
  }

  const currentCompany = visibilityContext.currentCompany
    ? {
        id: visibilityContext.currentCompany.id,
        name: visibilityContext.currentCompany.name,
        type: visibilityContext.currentCompany.type,
      }
    : null;

  const products = await listVisibleProducts({
    sessionUser,
    preferredCompanyId,
    includeSponsoredProducts: input?.includeSponsoredProducts === true,
  });

  return {
    currentCompany,
    products,
  };
}
