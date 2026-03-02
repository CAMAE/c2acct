import { NextResponse } from "next/server";
import { evaluateUnlockedInsights } from "@/lib/insights/evaluateUnlocked";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  const insights = await evaluateUnlockedInsights(companyId);
  return NextResponse.json({ ok: true, companyId, insights });
}
