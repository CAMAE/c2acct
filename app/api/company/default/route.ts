import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const first = await prisma.company.findFirst({ select: { id: true } });
  return NextResponse.json({ ok: true, companyId: first?.id ?? null });
}
