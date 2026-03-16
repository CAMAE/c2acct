import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import {
  getAssessmentModuleCatalogEntry,
  isExplicitRuntimeReportableModule,
} from "@/lib/assessment-module-catalog";
import { getDefaultReportProfileForAssessmentTarget } from "@/lib/report-profiles";
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
  const productId = visibleSubject.subject.product?.id ?? null;
  const requestedModuleKey = requestUrl.searchParams.get("moduleKey")?.trim() ?? "";

  const defaultReportProfile = getDefaultReportProfileForAssessmentTarget({ productId });
  const defaultModuleKey = defaultReportProfile?.primaryModuleKey ?? "";
  const effectiveModuleKey = requestedModuleKey || defaultModuleKey;

  if (!effectiveModuleKey) {
    return NextResponse.json(
      { ok: false, error: "No reporting module configured" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }

  const moduleEntry = getAssessmentModuleCatalogEntry(effectiveModuleKey);
  if (!moduleEntry) {
    return NextResponse.json(
      { ok: false, error: "Module not found" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  if (requestedModuleKey && !isExplicitRuntimeReportableModule(moduleEntry)) {
    return NextResponse.json(
      { ok: false, error: "Module not available for runtime reporting" },
      { status: 404, headers: NO_STORE_HEADERS }
    );
  }

  if (productId && moduleEntry.scope !== "PRODUCT") {
    return NextResponse.json(
      { ok: false, error: "moduleKey is not valid for product-scoped reporting" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!productId && moduleEntry.scope === "PRODUCT") {
    return NextResponse.json(
      { ok: false, error: "moduleKey is not valid for company-root reporting" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    const result = await prisma.surveySubmission.findFirst({
      where: productId
        ? { companyId, productId, SurveyModule: { key: effectiveModuleKey } }
        : { companyId, SurveyModule: { key: effectiveModuleKey } },
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

    return NextResponse.json(
      {
        ok: true,
        result,
        reportProfileKey: defaultReportProfile?.key ?? null,
        moduleKey: effectiveModuleKey,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load results" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
