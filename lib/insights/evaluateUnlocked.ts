import { prisma } from "@/lib/prisma";

export async function evaluateUnlocked(companyId: string) {
  const rows = await prisma.companyBadge.findMany({
    where: { companyId },
    orderBy: { awardedAt: "asc" },
    include: { Badge: true },
  });

  return rows.map((r: any) => ({
    id: r.badgeId,
    title: r.Badge?.name ?? "Unlocked",
    badgeId: r.badgeId,
    moduleId: r.moduleId,
    awardedAt: r.awardedAt,
  }));
}


