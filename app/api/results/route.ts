import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolveAssessmentReadContextFromSessionUser } from "@/lib/assessmentTarget";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = resolveAssessmentReadContextFromSessionUser(sessionUser);
  if (!assessmentContext) {
    return forbiddenResponse("No company assigned");
  }
  const companyId = assessmentContext.companyId;

  try {
    const result = await prisma.surveySubmission.findFirst({
      where: { companyId },
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

    return NextResponse.json({ ok: true, result }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load results" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
