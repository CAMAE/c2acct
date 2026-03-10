import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { unauthorizedResponse } from "@/lib/authz";
import {
  resolveAssessmentTargetFromSessionUserWithOptionalProduct,
} from "@/lib/assessmentTarget";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
const TIER1_BADGE_NAME = "Tier 1 Unlocked";
const PRODUCT_BADGE_NAME = "Product GTM Unlocked";
const PRODUCT_INSIGHT_KEYS = [
  "product_positioning_clarity",
  "product_workflow_fit_snapshot",
  "product_integration_readiness",
  "product_onboarding_friction_estimate",
  "product_support_confidence_signal",
  "product_gtm_readiness_summary",
  "product_improvement_priorities",
];

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const requestUrl = new URL(req.url);
  const requestedProductId = requestUrl.searchParams.get("productId")?.trim() ?? "";

  const readContextResolution = await resolveAssessmentTargetFromSessionUserWithOptionalProduct({
    sessionUser,
    requestedProductId,
  });

  if (!readContextResolution.ok) {
    return NextResponse.json(
      { ok: false, error: readContextResolution.error },
      { status: readContextResolution.status, headers: NO_STORE_HEADERS }
    );
  }

  const companyId = readContextResolution.context.companyId;
  const targetProductId = readContextResolution.context.productId;

  try {
    const badgeName = targetProductId ? PRODUCT_BADGE_NAME : TIER1_BADGE_NAME;
    const badge = await prisma.badge.findFirst({
      where: { name: badgeName },
      select: { id: true },
    });

    if (!badge) return NextResponse.json({ ok: true, unlocked: [] }, { headers: NO_STORE_HEADERS });

    const earned = await prisma.companyBadge.findFirst({
      where: { companyId, badgeId: badge.id, productId: targetProductId },
      select: { id: true },
    });

    if (!earned) return NextResponse.json({ ok: true, unlocked: [] }, { headers: NO_STORE_HEADERS });

    const insightWhere = targetProductId
      ? { key: { in: PRODUCT_INSIGHT_KEYS }, active: true }
      : { tier: 1, active: true };

    const insights = await prisma.insight.findMany({
      where: insightWhere,
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
