import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import { getRecentAudit } from "@/lib/agents/adminConsole";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const agentKey = url.searchParams.get("agent") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));

  const audit = await getRecentAudit(limit, agentKey);
  return NextResponse.json({ ok: true, audit }, { headers: { "cache-control": "no-store" } });
}
