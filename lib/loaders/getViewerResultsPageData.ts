import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import {
  getAssessmentModuleCatalogEntry,
  isExplicitRuntimeReportableModule,
} from "@/lib/assessment-module-catalog";
import { getDefaultReportProfileForAssessmentTarget } from "@/lib/report-profiles";
import { resolveVisibleSubject } from "@/lib/visibility";
import { getViewerProductContextData } from "@/lib/loaders/getViewerProductContext";

export type ViewerResultsPageData =
  | {
      kind: "unauthorized";
    }
  | {
      kind: "forbidden";
      context: Awaited<ReturnType<typeof getViewerProductContextData>>;
    }
  | {
      kind: "error";
      context: Awaited<ReturnType<typeof getViewerProductContextData>>;
      error: string;
    }
  | {
      kind: "ok";
      context: Exclude<Awaited<ReturnType<typeof getViewerProductContextData>>, { kind: "unauthorized" | "forbidden" }>;
      result: {
        id: string;
        createdAt: Date;
        moduleId: string;
        companyId: string;
        productId: string | null;
        score: number;
        weightedAvg: number | null;
        answeredCount: number;
        signalIntegrityScore: number | null;
      } | null;
      reportProfileKey: string | null;
      moduleKey: string;
      productIdFilter: string | null;
    };

function normalizeQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }
  return typeof value === "string" ? value.trim() : "";
}

export async function getViewerResultsPageData(input?: {
  searchParams?: Record<string, string | string[] | undefined>;
}): Promise<ViewerResultsPageData> {
  const productIdFilter = normalizeQueryValue(input?.searchParams?.productId).trim() || null;
  const context = await getViewerProductContextData({
    searchParams: input?.searchParams,
    includeSponsoredProducts: true,
  });

  if (context.kind === "unauthorized") {
    return { kind: "unauthorized" };
  }

  if (context.kind !== "ok") {
    return { kind: "forbidden", context };
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { kind: "unauthorized" };
  }

  const preferredCompanyId = await resolvePreferredViewerCompanyId(input?.searchParams);
  const visibleSubject = await resolveVisibleSubject({
    sessionUser,
    preferredCompanyId,
    requestedProductId: productIdFilter,
    includeSponsoredProducts: true,
  });

  if (!visibleSubject.ok) {
    return visibleSubject.status === 401
      ? { kind: "unauthorized" }
      : visibleSubject.status === 403
        ? { kind: "forbidden", context }
        : { kind: "error", context, error: visibleSubject.error };
  }

  const productId = visibleSubject.subject.product?.id ?? null;
  const defaultReportProfile = getDefaultReportProfileForAssessmentTarget({ productId });
  const effectiveModuleKey = defaultReportProfile?.primaryModuleKey ?? "";

  if (!effectiveModuleKey) {
    return { kind: "error", context, error: "No reporting module configured" };
  }

  const moduleEntry = getAssessmentModuleCatalogEntry(effectiveModuleKey);
  if (!moduleEntry) {
    return { kind: "error", context, error: "Module not found" };
  }

  if (!isExplicitRuntimeReportableModule(moduleEntry)) {
    return { kind: "error", context, error: "Module not available for runtime reporting" };
  }

  if (productId && moduleEntry.scope !== "PRODUCT") {
    return { kind: "error", context, error: "moduleKey is not valid for product-scoped reporting" };
  }

  if (!productId && moduleEntry.scope === "PRODUCT") {
    return { kind: "error", context, error: "moduleKey is not valid for company-root reporting" };
  }

  try {
    const result = await prisma.surveySubmission.findFirst({
      where: productId
        ? { companyId: visibleSubject.subject.company.id, productId, SurveyModule: { key: effectiveModuleKey } }
        : { companyId: visibleSubject.subject.company.id, SurveyModule: { key: effectiveModuleKey } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        moduleId: true,
        companyId: true,
        productId: true,
        score: true,
        weightedAvg: true,
        answeredCount: true,
        signalIntegrityScore: true,
      },
    });

    return {
      kind: "ok",
      context,
      result,
      reportProfileKey: defaultReportProfile?.key ?? null,
      moduleKey: effectiveModuleKey,
      productIdFilter,
    };
  } catch {
    return { kind: "error", context, error: "Unable to load results" };
  }
}
