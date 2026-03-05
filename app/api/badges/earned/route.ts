import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/companyContext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = await resolveCompanyId(searchParams);

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

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

  return NextResponse.json({ ok: true, earned });
}
