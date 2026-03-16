import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { forbiddenResponse, isPlatformAdmin, unauthorizedResponse } from "@/lib/authz";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function hasInternalHealthAccess(req: Request) {
  const configuredKey = process.env.INTERNAL_HEALTHCHECK_KEY?.trim() ?? "";
  if (!configuredKey) {
    return false;
  }

  const presentedKey = req.headers.get("x-aae-internal-health-key")?.trim() ?? "";
  return presentedKey.length > 0 && presentedKey === configuredKey;
}

export async function GET(req: Request) {
  const sessionUser = await getSessionUser();
  const internalAccess = hasInternalHealthAccess(req);

  if (!sessionUser && !internalAccess) {
    return unauthorizedResponse();
  }

  if (!internalAccess && !isPlatformAdmin(sessionUser)) {
    return forbiddenResponse("Platform admin or internal health access required");
  }

  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database unavailable" },
      { status: 503, headers: NO_STORE_HEADERS }
    );
  }
}
