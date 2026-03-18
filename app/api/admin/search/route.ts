import { NextResponse } from "next/server";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/authz";
import { getAdminNoStoreHeaders, requirePlatformAdminApi, searchAdminEntities, type AdminSearchFilter } from "@/lib/admin/controlPlane";

const VALID_FILTERS: readonly AdminSearchFilter[] = ["all", "company", "firm", "vendor", "product", "user", "audit"];

export async function GET(req: Request) {
  const access = await requirePlatformAdminApi();
  if (!access.ok) {
    return access.status === 401 ? unauthorizedResponse(access.error) : forbiddenResponse(access.error);
  }

  const requestUrl = new URL(req.url);
  const q = requestUrl.searchParams.get("q")?.trim() ?? "";
  const type = (requestUrl.searchParams.get("type")?.trim() ?? "all") as AdminSearchFilter;
  const limit = Number.parseInt(requestUrl.searchParams.get("limit") ?? "20", 10);

  const results = await searchAdminEntities({
    query: q,
    filter: VALID_FILTERS.includes(type) ? type : "all",
    limit: Number.isFinite(limit) ? limit : 20,
  });

  return NextResponse.json(
    {
      ok: true,
      query: q,
      filter: VALID_FILTERS.includes(type) ? type : "all",
      results,
    },
    { headers: getAdminNoStoreHeaders() }
  );
}
