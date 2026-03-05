import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  // Tier1 gating: if Tier1 badge earned, return Tier1 insights (stub unlock)
  const tier1 = await prisma.companyBadge.findFirst({
    where: { companyId, name: "Tier 1 Unlocked" },
    select: { id: true },
  });

  if (!tier1) {
    return NextResponse.json({ ok: true, unlocked: [] });
  }

  const insights = await prisma.insight.findMany({
    where: { tier: 1, active: true },
    orderBy: { key: "asc" },
    select: { id: true, key: true, title: true, body: true, tier: true },
  });

  return NextResponse.json({ ok: true, unlocked: insights });
}
