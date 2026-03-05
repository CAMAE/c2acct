import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const existing = cookieStore.get("aae_companyId")?.value;

  // If already selected, don't trigger client auto-select/reload loop
  if (existing) {
    return NextResponse.json({ ok: true, companyId: null, alreadySelected: true });
  }

  const first = await prisma.company.findFirst({ select: { id: true } });
  return NextResponse.json({ ok: true, companyId: first?.id ?? null });
}
