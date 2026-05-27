import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import {
  getAgentConfig,
  getAgentsOverview,
  getPendingApprovals,
  getRecentAudit,
  getRunHistory,
} from "@/lib/agents/adminConsole";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ agentKey: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { agentKey } = await params;
  const config = await getAgentConfig(agentKey);
  if (!config) {
    return NextResponse.json({ ok: false, error: "agent not found" }, { status: 404 });
  }

  const [overviews, runs, audit, approvals] = await Promise.all([
    getAgentsOverview(),
    getRunHistory(20, agentKey),
    getRecentAudit(30, agentKey),
    getPendingApprovals(),
  ]);

  return NextResponse.json(
    {
      ok: true,
      overview: overviews.find((o) => o.key === agentKey) ?? null,
      config: { limits: config.limits, model: config.model, tools: config.tools, schedule: config.schedule },
      runs,
      audit,
      approvals: approvals.filter((a) => a.agentKey === agentKey),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
