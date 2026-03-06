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
