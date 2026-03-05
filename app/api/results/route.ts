import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { resolveCompanyId } from "@/lib/companyContext";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = await resolveCompanyId(searchParams);

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  const result = await prisma.surveySubmission.findFirst({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ ok: true, result });
}
