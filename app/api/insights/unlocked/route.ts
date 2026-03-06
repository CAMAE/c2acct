import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const companyId = sessionUser.companyId;
  if (!companyId) {
    return forbiddenResponse("No company assigned");
  }

  const badge = await prisma.badge.findFirst({
    where: { name: "Tier 1 Unlocked" },
    select: { id: true },
  });

  if (!badge) return NextResponse.json({ ok: true, unlocked: [] });

  const earned = await prisma.companyBadge.findFirst({
    where: { companyId, badgeId: badge.id },
    select: { id: true },
  });

  if (!earned) return NextResponse.json({ ok: true, unlocked: [] });

  const insights = await prisma.insight.findMany({
    where: { tier: 1, active: true },
    orderBy: { key: "asc" },
    select: { id: true, key: true, title: true, body: true, tier: true },
  });

  return NextResponse.json({ ok: true, unlocked: insights });
}
