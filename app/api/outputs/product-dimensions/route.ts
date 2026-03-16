import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { unauthorizedResponse } from "@/lib/authz";
import { resolvePreferredViewerCompanyId } from "@/lib/viewerScopePreference";
import { PRODUCT_BASELINE_MODULE_KEY } from "@/lib/intelligence/runtimeConfig";
import { computeVendorProductDimensionScores } from "@/lib/productOutputScoring";
import { resolveVisibleSubject } from "@/lib/visibility";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const PRODUCT_MODULE_KEY = PRODUCT_BASELINE_MODULE_KEY;

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

  if (!productId) {
    return NextResponse.json({ ok: true, dimensions: null, submissionId: null }, { headers: NO_STORE_HEADERS });
  }

  try {
    const latestSubmission = await prisma.surveySubmission.findFirst({
      where: {
        companyId,
        productId,
        SurveyModule: { key: PRODUCT_MODULE_KEY },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        moduleId: true,
        answers: true,
      },
    });

    if (!latestSubmission) {
      return NextResponse.json({ ok: true, dimensions: null, submissionId: null }, { headers: NO_STORE_HEADERS });
    }

    const questions = await prisma.surveyQuestion.findMany({
      where: { moduleId: latestSubmission.moduleId },
      select: { id: true, key: true },
    });

    const questionKeyById = new Map(questions.map((q) => [q.id, q.key]));
    const dimensions = computeVendorProductDimensionScores({
      answers: latestSubmission.answers,
      questionKeyById,
    });

    return NextResponse.json(
      { ok: true, dimensions, submissionId: latestSubmission.id },
      { headers: NO_STORE_HEADERS }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to compute product dimension scores" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
