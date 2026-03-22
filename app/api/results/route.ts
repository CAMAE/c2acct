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
    const result = await prisma.surveySubmission.findFirst({
      where: { companyId: access.companyId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, result }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to load results" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
