import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  requiresCompanyBackedAssessment,
  resolveAssessmentSubjectContext,
} from "@/lib/subjectContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const TIER1_BADGE_NAMES = ["Tier 1 Alignment Unlocked", "Tier 1 Unlocked"];

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
    const badges = await prisma.badge.findMany({
      where: { name: { in: TIER1_BADGE_NAMES } },
      select: { id: true },
    });

    if (badges.length === 0) return NextResponse.json({ ok: true, unlocked: [] }, { headers: NO_STORE_HEADERS });

    const earned = await prisma.companyBadge.findFirst({
      where: {
        badgeId: { in: badges.map((badge) => badge.id) },
        ...(assessmentContext.subjectId
          ? { subjectId: assessmentContext.subjectId }
          : { companyId: assessmentContext.companyId }),
      },
      select: { id: true },
    });

    if (!earned) return NextResponse.json({ ok: true, unlocked: [] }, { headers: NO_STORE_HEADERS });

    const insights = await prisma.insight.findMany({
      where: { tier: 1, active: true },
      orderBy: { key: "asc" },
      select: { id: true, key: true, title: true, body: true, tier: true },
    });

    return NextResponse.json({ ok: true, unlocked: insights }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load unlocked insights" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
