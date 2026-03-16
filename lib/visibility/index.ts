import type { CompanyType, PlatformRole, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolveViewerContext, type ViewerContext } from "@/lib/viewerContext";

type SessionVisibilityUser = {
  id: string;
  role: UserRole;
  companyId: string | null;
  platformRole: PlatformRole;
};

type VisibilityCompany = {
  id: string;
  name: string;
  type: CompanyType;
  accessReason: "MEMBERSHIP" | "SPONSORSHIP";
};

type VisibilityProduct = {
  id: string;
  name: string;
  companyId: string;
  accessReason: "OWNED" | "SPONSORED";
};

export type VisibleSubject = {
  company: {
    id: string;
    name: string;
    type: CompanyType;
  };
  product: {
    id: string;
    name: string;
    companyId: string;
  } | null;
};

export type VisibilityContext = {
  viewerContext: ViewerContext;
  currentCompany: {
    id: string;
    name: string;
    type: CompanyType;
  } | null;
};

type VisibilityAccessResult<T> =
  | {
      ok: true;
      viewerContext: ViewerContext;
      entity: T;
    }
  | {
      ok: false;
      status: 401 | 403 | 404;
      error: string;
    };

function isPlatformOperator(platformRole: PlatformRole) {
  return platformRole === "PLATFORM_ADMIN" || platformRole === "PLATFORM_OWNER";
}

export async function resolveVisibilityContext(input: {
  sessionUser: SessionVisibilityUser | null | undefined;
  preferredCompanyId?: string | null;
}): Promise<VisibilityContext | null> {
  const viewerContext = await resolveViewerContext(input);
  if (!viewerContext) {
    return null;
  }

  const currentCompanyId = viewerContext.currentCompanyId;
  if (!currentCompanyId) {
    return {
      viewerContext,
      currentCompany: null,
    };
  }

  const currentCompany = await prisma.company.findUnique({
    where: { id: currentCompanyId },
    select: { id: true, name: true, type: true },
  });

  return {
    viewerContext,
    currentCompany,
  };
}

export async function listVisibleCompanies(input: {
  sessionUser: SessionVisibilityUser | null | undefined;
  preferredCompanyId?: string | null;
}): Promise<VisibilityCompany[]> {
  const visibilityContext = await resolveVisibilityContext(input);
  if (!visibilityContext?.currentCompany) {
    return [];
  }

  if (isPlatformOperator(visibilityContext.viewerContext.platformRole)) {
    const companies = await prisma.company.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, type: true },
    });

    return companies.map((company) => ({
      ...company,
      accessReason: company.id === visibilityContext.currentCompany?.id ? "MEMBERSHIP" : "SPONSORSHIP",
    }));
  }

  const { currentCompany } = visibilityContext;
  const relationshipWhere =
    currentCompany.type === "FIRM"
      ? { firmCompanyId: currentCompany.id, status: "ACTIVE" as const }
      : { vendorCompanyId: currentCompany.id, status: "ACTIVE" as const };

  const visibleCompanies: VisibilityCompany[] = [
    {
      ...currentCompany,
      accessReason: "MEMBERSHIP",
    },
  ];

  if (currentCompany.type === "FIRM") {
    const relationships = await prisma.sponsorRelationship.findMany({
      where: relationshipWhere,
      select: { vendorCompany: { select: { id: true, name: true, type: true } } },
    });

    for (const relationship of relationships) {
      visibleCompanies.push({
        ...relationship.vendorCompany,
        accessReason: "SPONSORSHIP",
      });
    }
  } else {
    const relationships = await prisma.sponsorRelationship.findMany({
      where: relationshipWhere,
      select: { firmCompany: { select: { id: true, name: true, type: true } } },
    });

    for (const relationship of relationships) {
      visibleCompanies.push({
        ...relationship.firmCompany,
        accessReason: "SPONSORSHIP",
      });
    }
  }

  return [...new Map(visibleCompanies.map((company) => [company.id, company])).values()];
}

export async function listVisibleProducts(input: {
  sessionUser: SessionVisibilityUser | null | undefined;
  preferredCompanyId?: string | null;
  includeSponsoredProducts?: boolean;
}): Promise<VisibilityProduct[]> {
  const visibilityContext = await resolveVisibilityContext(input);
  if (!visibilityContext?.currentCompany) {
    return [];
  }

  const includeSponsoredProducts = input.includeSponsoredProducts === true;
  const { currentCompany, viewerContext } = visibilityContext;

  if (isPlatformOperator(viewerContext.platformRole)) {
    const platformProducts = await prisma.product.findMany({
      orderBy: [{ companyId: "asc" }, { name: "asc" }],
      select: { id: true, name: true, companyId: true },
    });

    return platformProducts.map((product) => ({
      ...product,
      accessReason: product.companyId === currentCompany.id ? "OWNED" : "SPONSORED",
    }));
  }

  const products: VisibilityProduct[] = [];

  const ownedProducts = await prisma.product.findMany({
    where: { companyId: currentCompany.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, companyId: true },
  });

  for (const product of ownedProducts) {
    products.push({
      ...product,
      accessReason: "OWNED",
    });
  }

  if (!includeSponsoredProducts || currentCompany.type !== "FIRM") {
    return products;
  }

  const sponsoredRelationships = await prisma.sponsorRelationship.findMany({
    where: {
      firmCompanyId: currentCompany.id,
      status: "ACTIVE",
      productAccessMode: "ALL_PRODUCTS",
    },
    select: { vendorCompanyId: true },
  });

  const vendorCompanyIds = [...new Set(sponsoredRelationships.map((relationship) => relationship.vendorCompanyId))];
  if (vendorCompanyIds.length === 0) {
    return products;
  }

  const sponsoredProducts = await prisma.product.findMany({
    where: { companyId: { in: vendorCompanyIds } },
    orderBy: [{ companyId: "asc" }, { name: "asc" }],
    select: { id: true, name: true, companyId: true },
  });

  for (const product of sponsoredProducts) {
    products.push({
      ...product,
      accessReason: "SPONSORED",
    });
  }

  return [...new Map(products.map((product) => [product.id, product])).values()];
}

export async function assertViewerCanAccessCompany(input: {
  sessionUser: SessionVisibilityUser | null | undefined;
  targetCompanyId: string | null | undefined;
  preferredCompanyId?: string | null;
}): Promise<VisibilityAccessResult<{ id: string; name: string; type: CompanyType }>> {
  const targetCompanyId = typeof input.targetCompanyId === "string" ? input.targetCompanyId.trim() : "";
  if (!targetCompanyId) {
    return {
      ok: false,
      status: 404,
      error: "Company not found",
    };
  }

  const visibilityContext = await resolveVisibilityContext(input);
  if (!visibilityContext) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: targetCompanyId },
    select: { id: true, name: true, type: true },
  });

  if (!company) {
    return {
      ok: false,
      status: 404,
      error: "Company not found",
    };
  }

  if (isPlatformOperator(visibilityContext.viewerContext.platformRole)) {
    return {
      ok: true,
      viewerContext: visibilityContext.viewerContext,
      entity: company,
    };
  }

  const visibleCompanies = await listVisibleCompanies(input);
  if (!visibleCompanies.some((visibleCompany) => visibleCompany.id === company.id)) {
    return {
      ok: false,
      status: 403,
      error: "Company is not visible in the current viewer scope",
    };
  }

  return {
    ok: true,
    viewerContext: visibilityContext.viewerContext,
    entity: company,
  };
}

export async function assertViewerCanAccessProduct(input: {
  sessionUser: SessionVisibilityUser | null | undefined;
  targetProductId: string | null | undefined;
  preferredCompanyId?: string | null;
  includeSponsoredProducts?: boolean;
}): Promise<VisibilityAccessResult<{ id: string; name: string; companyId: string }>> {
  const targetProductId = typeof input.targetProductId === "string" ? input.targetProductId.trim() : "";
  if (!targetProductId) {
    return {
      ok: false,
      status: 404,
      error: "Product not found",
    };
  }

  const visibilityContext = await resolveVisibilityContext(input);
  if (!visibilityContext) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  const product = await prisma.product.findUnique({
    where: { id: targetProductId },
    select: { id: true, name: true, companyId: true },
  });

  if (!product) {
    return {
      ok: false,
      status: 404,
      error: "Product not found",
    };
  }

  if (isPlatformOperator(visibilityContext.viewerContext.platformRole)) {
    return {
      ok: true,
      viewerContext: visibilityContext.viewerContext,
      entity: product,
    };
  }

  const visibleProducts = await listVisibleProducts({
    sessionUser: input.sessionUser,
    preferredCompanyId: input.preferredCompanyId,
    includeSponsoredProducts: input.includeSponsoredProducts,
  });
  if (!visibleProducts.some((visibleProduct) => visibleProduct.id === product.id)) {
    return {
      ok: false,
      status: 403,
      error: "Product is not visible in the current viewer scope",
    };
  }

  return {
    ok: true,
    viewerContext: visibilityContext.viewerContext,
    entity: product,
  };
}

export async function resolveVisibleSubject(input: {
  sessionUser: SessionVisibilityUser | null | undefined;
  preferredCompanyId?: string | null;
  requestedCompanyId?: string | null;
  requestedProductId?: string | null;
  includeSponsoredProducts?: boolean;
}): Promise<
  | {
      ok: true;
      viewerContext: ViewerContext;
      subject: VisibleSubject;
    }
  | {
      ok: false;
      status: 401 | 403 | 404;
      error: string;
    }
> {
  const visibilityContext = await resolveVisibilityContext({
    sessionUser: input.sessionUser,
    preferredCompanyId: input.preferredCompanyId,
  });
  if (!visibilityContext) {
    return {
      ok: false,
      status: 401,
      error: "Unauthorized",
    };
  }

  const requestedCompanyId =
    typeof input.requestedCompanyId === "string" ? input.requestedCompanyId.trim() : "";
  const requestedProductId =
    typeof input.requestedProductId === "string" ? input.requestedProductId.trim() : "";

  if (requestedProductId) {
    const productAccess = await assertViewerCanAccessProduct({
      sessionUser: input.sessionUser,
      preferredCompanyId: input.preferredCompanyId,
      targetProductId: requestedProductId,
      includeSponsoredProducts: input.includeSponsoredProducts,
    });

    if (!productAccess.ok) {
      return productAccess;
    }

    if (requestedCompanyId && requestedCompanyId !== productAccess.entity.companyId) {
      return {
        ok: false,
        status: 403,
        error: "Requested company does not match the visible product owner",
      };
    }

    const company = await prisma.company.findUnique({
      where: { id: productAccess.entity.companyId },
      select: { id: true, name: true, type: true },
    });

    if (!company) {
      return {
        ok: false,
        status: 404,
        error: "Company not found",
      };
    }

    return {
      ok: true,
      viewerContext: visibilityContext.viewerContext,
      subject: {
        company,
        product: productAccess.entity,
      },
    };
  }

  const targetCompanyId = requestedCompanyId || visibilityContext.currentCompany?.id || "";
  const companyAccess = await assertViewerCanAccessCompany({
    sessionUser: input.sessionUser,
    preferredCompanyId: input.preferredCompanyId,
    targetCompanyId,
  });

  if (!companyAccess.ok) {
    return companyAccess;
  }

  return {
    ok: true,
    viewerContext: visibilityContext.viewerContext,
    subject: {
      company: companyAccess.entity,
      product: null,
    },
  };
}
