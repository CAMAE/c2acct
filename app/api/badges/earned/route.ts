import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
type Row = Awaited<ReturnType<typeof prisma.companyBadge.findMany>>[number];
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");
    if (!companyId) {
      return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
    }
    const rows: Row[] = await prisma.companyBadge.findMany({
      where: { companyId },
      orderBy: { awardedAt: "asc" },
      include: { Badge: true },
    });

    const earned = rows.map((r: Row) => ({
      id: r.badgeId,
      badgeId: r.badgeId,
      moduleId: r.moduleId,
      awardedAt: r.awardedAt,
      name: r.Badge?.name ?? null,
      key: r.Badge?.key ?? null,
    }));

    return NextResponse.json({ ok: true, earned });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}



