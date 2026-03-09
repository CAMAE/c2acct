import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import {
  resolveAssessmentReadContextFromSessionUser,
  resolveAssessmentReadContextFromSessionUserWithOptionalProduct,
} from "@/lib/assessmentTarget";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const assessmentContext = resolveAssessmentReadContextFromSessionUser(sessionUser);
  if (!assessmentContext) {
    return forbiddenResponse("No company assigned");
  }
  const requestUrl = new URL(req.url);
  const requestedProductId = requestUrl.searchParams.get("productId")?.trim() ?? "";

  const readContextResolution = await resolveAssessmentReadContextFromSessionUserWithOptionalProduct({
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
  const targetProductId = readContextResolution.context.targetProductId;

  try {
    const badge = await prisma.badge.findFirst({
      where: { name: "Tier 1 Unlocked" },
      select: { id: true },
    });

    if (!badge) return NextResponse.json({ ok: true, unlocked: [] }, { headers: NO_STORE_HEADERS });

    const earned = await prisma.companyBadge.findFirst({
      where: { companyId, badgeId: badge.id, productId: targetProductId },
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
