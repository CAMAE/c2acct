import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  if (!requiresCompanyBackedAssessment(assessmentContext)) {
    return forbiddenResponse("Current assessment flow requires a company-backed subject");
  }

  try {
    const rows = await prisma.companyBadge.findMany({
      where: assessmentContext.subjectId
        ? { subjectId: assessmentContext.subjectId }
        : { companyId: assessmentContext.companyId },
      orderBy: { awardedAt: "desc" },
      include: { Badge: { select: { name: true } } },
    });

    const earned = rows.map((r) => ({
      id: r.id,
      badgeId: r.badgeId,
      moduleId: r.moduleId,
      awardedAt: r.awardedAt,
      name: r.Badge?.name ?? "",
    }));

    return NextResponse.json({ ok: true, earned, scope: assessmentContext }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load earned badges" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
