import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);

  // 1) Prefer query param (makes curl testing trivial)
  let companyId = (searchParams.get("companyId") ?? "").trim();

  // 2) Otherwise try JSON body (read as text once, parse ourselves)
  if (!companyId) {
    const raw = await req.text().catch(() => "");
    if (raw) {
      try {
        const body = JSON.parse(raw);
        companyId = String(body?.companyId ?? "").trim();
      } catch {
        // ignore
      }
    }
  }

  if (!companyId) {
    return NextResponse.json({ ok: false, error: "companyId required" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, companyId });
  res.cookies.set("aae_companyId", companyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30d
  });
  return res;
}
