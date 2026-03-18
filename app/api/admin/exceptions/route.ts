import { NextResponse } from "next/server";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { getAdminExceptions, getAdminNoStoreHeaders, requirePlatformAdminApi } from "@/lib/admin/controlPlane";

export async function GET(req: Request) {
  const access = await requirePlatformAdminApi();
  if (!access.ok) {
    return access.status === 401 ? unauthorizedResponse(access.error) : forbiddenResponse(access.error);
  }

  const requestUrl = new URL(req.url);
  const q = requestUrl.searchParams.get("q")?.trim() ?? "";
  const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "25", 10);
  const items = await getAdminExceptions({
    query: q,
    limit: Number.isFinite(limit) ? limit : 25,
  });

  return NextResponse.json(
    {
      ok: true,
      partial: true,
      supportedActions: ["inspect", "review source route", "retry health check"],
      items,
    },
    { headers: getAdminNoStoreHeaders() }
  );
}
