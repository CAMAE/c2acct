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
    const rows = await prisma.companyBadge.findMany({
      where: {
        companyId,
        productId: targetProductId,
      },
      orderBy: { awardedAt: "desc" },
      include: { Badge: { select: { name: true } } },
    });

    const earned = rows.map((r) => ({
      id: r.id,
      badgeId: r.badgeId,
      moduleId: r.moduleId,
      productId: r.productId,
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
