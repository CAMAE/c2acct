import { NextResponse } from "next/server";
import { evaluateUnlocked } from "@/lib/insights/evaluateUnlocked";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
    }

    const unlocked = await evaluateUnlocked(companyId);
    return NextResponse.json({ ok: true, unlocked });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
