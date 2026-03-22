import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { resolveAuthorizedCompanyId } from "@/lib/authz";
import { resolveCompanyId } from "@/lib/companyContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };
type BadgeRow = {
  id: string;
  badgeId: string;
  moduleId: string;
  awardedAt: Date;
  Badge: {
    name: string;
  } | null;
};

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  const requestedCompanyId = await resolveCompanyId(new URL(req.url).searchParams);
  const access = resolveAuthorizedCompanyId(sessionUser, requestedCompanyId);
  if (!access.ok) {
    return access.response;
  }

  try {
    const rows: BadgeRow[] = await prisma.companyBadge.findMany({
      where: { companyId: access.companyId },
      orderBy: { awardedAt: "desc" },
      include: { Badge: { select: { name: true } } },
    });

    const earned = rows.map((r: BadgeRow) => ({
      id: r.id,
      badgeId: r.badgeId,
      moduleId: r.moduleId,
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
