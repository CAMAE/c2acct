import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolveReviewTarget } from "@/lib/reviews/resolveReviewTarget";
import { evaluateExternalObservedEligibility } from "@/lib/reviews/evaluateExternalObservedEligibility";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  return /^(1|true|yes|on)$/i.test(value.trim());
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  const sessionCompanyId = typeof sessionUser?.companyId === "string" ? sessionUser.companyId.trim() : "";

  if (!sessionUser || !sessionCompanyId) {
    return unauthorizedResponse("No authenticated company context");
  }

  const requestUrl = new URL(req.url);
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

  const subjectCompanyId = subjectCompanyIdParam || sessionCompanyId;
  if (subjectCompanyId !== sessionCompanyId) {
    return forbiddenResponse("Cross-company observed reads are not allowed");
  }

  const subjectProductId = subjectProductIdParam || null;

  if (subjectProductId) {
    const subjectResolution = await resolveReviewTarget({
      subjectCompanyId,
      subjectProductId,
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
