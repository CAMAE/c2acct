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
    const rows = await prisma.companyBadge.findMany({
      where: { companyId },
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

    return NextResponse.json({ ok: true, earned }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load earned badges" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
