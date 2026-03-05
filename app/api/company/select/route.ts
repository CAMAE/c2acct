import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as any));
  const companyId = String(body?.companyId ?? "").trim();
  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("aae_companyId", companyId, { path: "/", httpOnly: true, sameSite: "lax" });
  return res;
}
