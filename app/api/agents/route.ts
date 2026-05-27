import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import { getAgentsOverview, getHealthBanner } from "@/lib/agents/adminConsole";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const [agents, banner] = await Promise.all([getAgentsOverview(), getHealthBanner()]);
  return NextResponse.json({ ok: true, banner, agents }, { headers: { "cache-control": "no-store" } });
}
