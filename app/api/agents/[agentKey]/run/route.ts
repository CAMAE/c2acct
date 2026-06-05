import { spawn } from "node:child_process";
import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import { getAgentConfig } from "@/lib/agents/adminConsole";
import { enqueueTrigger } from "@/lib/agents/triggerQueue";

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

/** Build the per-run env overrides a command implies for the targeted agent. */
function buildTaskEnv(agentKey: string, message: string): Record<string, string> {
  const taskEnv: Record<string, string> = {};
  if (agentKey === "pilot-ops" && message) {
    const parsed = parsePilotTask(message);
    if (parsed.task) taskEnv.PAT_PILOT_TASK = parsed.task;
    if (parsed.firm) taskEnv.PAT_PILOT_FIRM = parsed.firm;
  }
  if (agentKey === "internal-knowledge" && message) {
    taskEnv.PAT_KNOWLEDGE_QUERY = message;
  }
  return taskEnv;
}

/**
 * Trigger mode (Phase 2.5 #5):
 * - Production (Vercel): agents run on the Mac mini supervisor, not in this
 *   runtime — enqueue an AgentTriggerRequest row that the supervisor polls.
 * - Local dev: spawn the agent directly (same machine, instant feedback).
 *   Set PAT_AGENT_TRIGGER_QUEUE=1 to force queue mode locally when testing
 *   the supervisor poll loop end-to-end.
 */
function triggerQueueEnabled(): boolean {
  if (process.env.PAT_AGENT_TRIGGER_QUEUE === "1") return true;
  if (process.env.PAT_AGENT_TRIGGER_QUEUE === "0") return false;
  return process.env.NODE_ENV === "production";
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
  const taskEnv = buildTaskEnv(agentKey, message);

  if (triggerQueueEnabled()) {
    const { id } = await enqueueTrigger({
      agentKey,
      message: message || null,
      taskEnv: Object.keys(taskEnv).length > 0 ? taskEnv : null,
      requestedBy: auth.email,
    });
    return NextResponse.json(
      {
        ok: true,
        agentKey,
        triggered: true,
        queued: true,
        triggerId: id,
        task: taskEnv.PAT_PILOT_TASK ?? null,
        message: message || null,
      },
      { headers: { "cache-control": "no-store" } }
    );
  }

  // Local dev: fire-and-forget — a detached process runs the agent so the
  // request returns immediately (a gated agent may then block on approval).
  const env: NodeJS.ProcessEnv = { ...process.env, ...taskEnv };
  const child = spawn("node", ["--import", "tsx", "scripts/agents/run-agent.ts", agentKey], {
    cwd: process.cwd(),
    env,
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json(
    {
      ok: true,
      agentKey,
      triggered: true,
      queued: false,
      task: taskEnv.PAT_PILOT_TASK ?? null,
      message: message || null,
    },
    { headers: { "cache-control": "no-store" } }
  );
}
