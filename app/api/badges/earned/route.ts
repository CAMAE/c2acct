import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "Missing companyId" }, { status: 400 });
  }

  const awards = await prisma.companyBadge.findMany({
    where: { companyId },
    orderBy: { awardedAt: "desc" },
    include: { Badge: true },
  });

  const moduleIds = Array.from(new Set(awards.map((a) => a.moduleId).filter(Boolean)));
  const modules = moduleIds.length
    ? await prisma.surveyModule.findMany({
        where: { id: { in: moduleIds } },
        select: { id: true, key: true, version: true },
      })
    : [];

  const moduleById = new Map(modules.map((m) => [m.id, m]));

  return NextResponse.json({
    ok: true,
    companyId,
    badges: awards.map((a) => {
      const m = moduleById.get(a.moduleId);
      return {
        id: a.id,
        badgeId: a.badgeId,
        badgeKey: (a as any).Badge?.key ?? null,
        name: (a as any).Badge?.name ?? null,
        moduleId: a.moduleId,
        moduleKey: m?.key ?? null,
        moduleVersion: m?.version ?? null,
        awardedAt: a.awardedAt,
      };
    }),
  });
}