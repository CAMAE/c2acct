import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const companyId = sessionUser.companyId;
  if (!companyId) {
    return forbiddenResponse("No company assigned");
  }

  try {
    const result = await prisma.surveySubmission.findFirst({
      where: { companyId },
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
