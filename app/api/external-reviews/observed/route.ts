import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { resolveReviewTarget } from "@/lib/reviews/resolveReviewTarget";
import { evaluateExternalObservedEligibility } from "@/lib/reviews/evaluateExternalObservedEligibility";
import { assertViewerCanAccessCompany, assertViewerCanAccessProduct } from "@/lib/visibility";
import { resolveViewerContext } from "@/lib/viewerContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse("No authenticated company context");
  }

  const requestUrl = new URL(req.url);
  const preferredCompanyId = await resolvePreferredViewerCompanyId(requestUrl.searchParams);
  const moduleKey = requestUrl.searchParams.get("moduleKey")?.trim() ?? "";
  const moduleId = requestUrl.searchParams.get("moduleId")?.trim() ?? "";
  const subjectCompanyIdParam = requestUrl.searchParams.get("subjectCompanyId")?.trim() ?? "";
  const subjectProductIdParam = requestUrl.searchParams.get("subjectProductId")?.trim() ?? "";

  if (!moduleKey && !moduleId) {
    return NextResponse.json(
      { ok: false, error: "moduleKey or moduleId is required" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const moduleByKeyPromise = moduleKey
    ? prisma.surveyModule.findUnique({
        where: { key: moduleKey },
        select: { id: true, key: true, axis: true, active: true },
      })
    : Promise.resolve(null);

  const moduleByIdPromise = moduleId
    ? prisma.surveyModule.findUnique({
        where: { id: moduleId },
        select: { id: true, key: true, axis: true, active: true },
      })
    : Promise.resolve(null);

  const [moduleByKey, moduleById] = await Promise.all([moduleByKeyPromise, moduleByIdPromise]);

  if (moduleKey && !moduleByKey) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (moduleId && !moduleById) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (moduleByKey && moduleById && moduleByKey.id !== moduleById.id) {
    return NextResponse.json(
      { ok: false, error: "moduleKey and moduleId refer to different modules" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const moduleRecord = moduleByKey ?? moduleById;
  if (!moduleRecord || !moduleRecord.active) {
    return NextResponse.json({ ok: false, error: "Module not found" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  if (moduleRecord.axis !== "EXTERNAL_REVIEW") {
    return NextResponse.json(
      { ok: false, error: "Module is not EXTERNAL_REVIEW" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const viewerContext = await resolveViewerContext({
    sessionUser,
    preferredCompanyId,
  });
  const subjectCompanyId = subjectCompanyIdParam || viewerContext?.currentCompanyId || "";
  if (!subjectCompanyId) {
    return forbiddenResponse("No subject company available");
  }

  const subjectProductId = subjectProductIdParam || null;

  const companyAccess = await assertViewerCanAccessCompany({
    sessionUser,
    preferredCompanyId,
    targetCompanyId: subjectCompanyId,
  });

  if (!companyAccess.ok) {
    if (companyAccess.status === 401) {
      return unauthorizedResponse(companyAccess.error);
    }

    if (companyAccess.status === 403) {
      return forbiddenResponse(companyAccess.error);
    }

    return NextResponse.json({ ok: false, error: companyAccess.error }, { status: companyAccess.status, headers: NO_STORE_HEADERS });
  }

  if (subjectProductId) {
    const productAccess = await assertViewerCanAccessProduct({
      sessionUser,
      preferredCompanyId,
      targetProductId: subjectProductId,
      includeSponsoredProducts: true,
    });

    if (!productAccess.ok) {
      if (productAccess.status === 401) {
        return unauthorizedResponse(productAccess.error);
      }

      if (productAccess.status === 403) {
        return forbiddenResponse(productAccess.error);
      }

      return NextResponse.json({ ok: false, error: productAccess.error }, { status: productAccess.status, headers: NO_STORE_HEADERS });
    }

    const subjectResolution = await resolveReviewTarget({
      subjectCompanyId,
      subjectProductId: productAccess.entity.id,
    });

    if (!subjectResolution.ok) {
      return NextResponse.json(
        { ok: false, error: subjectResolution.error },
        { status: subjectResolution.status, headers: NO_STORE_HEADERS }
      );
    }
  }

  const featureFlagEnabled = isEnabled(process.env.ENABLE_EXTERNAL_OBSERVED_SIGNALS);

  const eligibility = await evaluateExternalObservedEligibility({
    moduleId: moduleRecord.id,
    subjectCompanyId,
    subjectProductId,
    featureFlagEnabled,
  });

  return NextResponse.json(
    {
      ok: true,
      module: {
        id: moduleRecord.id,
        key: moduleRecord.key,
      },
      subject: {
        companyId: subjectCompanyId,
        productId: subjectProductId,
      },
      eligibility,
    },
    { headers: NO_STORE_HEADERS }
  );
}
