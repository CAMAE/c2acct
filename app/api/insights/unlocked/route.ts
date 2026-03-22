import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAuthorizedCompanyId } from "@/lib/authz";
import { resolveCompanyId } from "@/lib/companyContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  const requestedCompanyId = await resolveCompanyId(new URL(req.url).searchParams);
  const access = resolveAuthorizedCompanyId(sessionUser, requestedCompanyId);
  if (!access.ok) {
    return access.response;
  }

  try {
    const badge = await prisma.badge.findFirst({
      where: { name: "Tier 1 Unlocked" },
      select: { id: true },
    });

    if (!badge) return NextResponse.json({ ok: true, unlocked: [] }, { headers: NO_STORE_HEADERS });

    const earned = await prisma.companyBadge.findFirst({
      where: { companyId: access.companyId, badgeId: badge.id },
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
