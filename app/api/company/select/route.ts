import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  canAccessCompany,
  forbiddenResponse,
  hasCompany,
  unauthorizedResponse,
} from "@/lib/authz";

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  if (!hasCompany(sessionUser)) {
    return forbiddenResponse("No company assigned");
  }

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

  // Keep UX stable: if no hint provided, default to session company.
  if (!companyId) {
    companyId = sessionUser.companyId ?? "";
  }

  if (!canAccessCompany(sessionUser, companyId)) {
    return forbiddenResponse();
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
