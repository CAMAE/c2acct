import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  // Tier1 gating: badge name is in Badge table; CompanyBadge stores badgeId
  const badge = await prisma.badge.findFirst({
    where: { name: "Tier 1 Unlocked" },
    select: { id: true },
  });

  if (!badge) {
    return NextResponse.json({ ok: true, unlocked: [] });
  }

  const earned = await prisma.companyBadge.findFirst({
    where: { companyId, badgeId: badge.id },
    select: { id: true },
  });

  if (!earned) {
    return NextResponse.json({ ok: true, unlocked: [] });
  }

  // Stub unlock: return all Tier 1 active insights once Tier 1 badge is earned
  const insights = await prisma.insight.findMany({
    where: { tier: 1, active: true },
    orderBy: { key: "asc" },
    select: { id: true, key: true, title: true, body: true, tier: true },
  });

  return NextResponse.json({ ok: true, unlocked: insights });
}