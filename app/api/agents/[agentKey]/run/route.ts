import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import { getAgentConfig } from "@/lib/agents/adminConsole";

export const dynamic = "force-dynamic";

/** Parse a free-text command into pilot-ops task env (deterministic; Haiku seam). */
function parsePilotTask(message: string): { task?: string; firm?: string } {
  const lower = message.toLowerCase();
  if (/\b(draft|invite|invitation)\b/.test(lower)) {
    const match = message.match(/\bfor\s+(.+?)\s*$/i);
    return { task: "draft-invitation", firm: match ? match[1].trim() : undefined };
  }
  return {};
}

export async function POST(request: Request, { params }: { params: Promise<{ agentKey: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { agentKey } = await params;
  const config = await getAgentConfig(agentKey);
  if (!config) {
    return NextResponse.json({ ok: false, error: "agent not found" }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as { message?: string };
  const message = typeof body.message === "string" ? body.message : "";

  const env: NodeJS.ProcessEnv = { ...process.env };
  if (agentKey === "pilot-ops" && message) {
    const parsed = parsePilotTask(message);
    if (parsed.task) env.PAT_PILOT_TASK = parsed.task;
    if (parsed.firm) env.PAT_PILOT_FIRM = parsed.firm;
  }

  // Fire-and-forget: a detached process runs the agent so the request returns
  // immediately (a gated agent may then block on approval for minutes). Phase 1
  // runs locally on the Mac mini; this is the "enqueue a run" hand-off.
  const child = spawn("node", ["--import", "tsx", "scripts/agents/run-agent.ts", agentKey], {
    cwd: process.cwd(),
    env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json(
    { ok: true, agentKey, triggered: true, task: env.PAT_PILOT_TASK ?? null, message: message || null },
    { headers: { "cache-control": "no-store" } }
  );
}
