import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { resolveViewerContext, viewerCanAccessCompany } from "@/lib/viewerContext";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: Request) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return unauthorizedResponse();
  }

  const viewerContext = await resolveViewerContext({ sessionUser });
  if (!viewerContext?.defaultCompanyId) {
    return forbiddenResponse("No company assigned");
  }

  const { searchParams } = new URL(req.url);

  let companyId = (searchParams.get("companyId") ?? "").trim();

  if (!companyId) {
    const raw = await req.text().catch(() => "");
    if (raw) {
      try {
        const body = JSON.parse(raw);
        companyId = String(body?.companyId ?? "").trim();
      } catch {
        return NextResponse.json(
          { ok: false, error: "Invalid payload" },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
    }
  }

  if (!companyId) {
    companyId = viewerContext.defaultCompanyId ?? "";
  }

  if (!viewerCanAccessCompany(viewerContext, companyId)) {
    return forbiddenResponse();
  }

  const res = NextResponse.json({ ok: true, companyId });
  res.headers.set("Cache-Control", "no-store");
  // The cookie tracks preferred viewer scope only; memberships still decide authority.
  res.cookies.set("aae_companyId", companyId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
