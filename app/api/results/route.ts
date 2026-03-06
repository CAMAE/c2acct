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

  const result = await prisma.surveySubmission.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, result });
}
