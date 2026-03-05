import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ ok:false, error:"companyId required" },{status:400});
  }

  const latest = await prisma.surveySubmission.findFirst({
    where:{ companyId },
    orderBy:{ createdAt:"desc" }
  });

  return NextResponse.json({
    ok:true,
    result: latest
  });
}
