import prisma from "@/lib/prisma";
import { loadAgentConfigs } from "@/lib/agents/config";
import { runAgentByKey } from "@/lib/agents/sdk";

const AGENTS_DIR = "agents";

/** Dispatch a slash command to its handler. Returns the text reply. */
export async function handleCommand(text: string): Promise<string> {
  const [command, ...args] = text.trim().split(/\s+/);
  switch (command) {
    case "/status":
      return statusSummary();
    case "/queue":
      return pendingApprovals();
    case "/agents":
      return agentList();
    case "/qa":
      return qaCommand(args[0]);
    case "/knowledge":
      return knowledgeQuery(args.join(" "));
    case "/audit":
      return auditTail(args[0]);
    case "/help":
      return helpText();
    default:
      return `Unknown command ${command}.\n\n${helpText()}`;
  }
}

async function statusSummary(): Promise<string> {
  const configs = await loadAgentConfigs(AGENTS_DIR);
  const enabled = configs.filter((config) => config.enabled);
  const pending = await prisma.agentApproval.count({ where: { status: "pending" } });
  const lastRun = await prisma.agentRun.findFirst({ orderBy: { startedAt: "desc" } });
  const lastLine = lastRun
    ? `last run: ${lastRun.agentKey} → ${lastRun.status} (${lastRun.startedAt.toISOString()})`
    : "last run: (none)";
  return [
    "PAT agent ops",
    `agents enabled: ${enabled.length}/${configs.length}`,
    `pending approvals: ${pending}`,
    lastLine,
  ].join("\n");
}

async function pendingApprovals(): Promise<string> {
  const rows = await prisma.agentApproval.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (rows.length === 0) {
    return "Approval queue: empty.";
  }
  const lines = rows.map(
    (row) => `• ${row.agentKey}: ${row.proposedAction} [${row.blastRadius ?? "?"}] ref ${row.id}`
  );
  return ["Pending approvals:", ...lines].join("\n");
}

async function agentList(): Promise<string> {
  const configs = await loadAgentConfigs(AGENTS_DIR);
  const lines = await Promise.all(
    configs
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(async (config) => {
        const lastRun = await prisma.agentRun.findFirst({
          where: { agentKey: config.key },
          orderBy: { startedAt: "desc" },
        });
        const state = config.enabled ? "enabled" : "disabled";
        const last = lastRun ? `${lastRun.status} @ ${lastRun.startedAt.toISOString()}` : "never run";
        return `• ${config.key} (${state}) — ${last}`;
      })
  );
  return ["Agents:", ...lines].join("\n");
}

async function qaCommand(sub: string | undefined): Promise<string> {
  if (sub === "run") {
    const outcome = await runAgentByKey("qa-smoke", { trigger: "manual", triggerSource: "telegram" });
    return `qa-smoke run ${outcome.runId} → ${outcome.status}\n${outcome.summary ?? outcome.error ?? ""}`.trim();
  }
  // default: status of the last qa-smoke run
  const lastRun = await prisma.agentRun.findFirst({
    where: { agentKey: "qa-smoke" },
    orderBy: { startedAt: "desc" },
  });
  if (!lastRun) {
    return "qa-smoke: no runs yet. Use /qa run to trigger one.";
  }
  return [
    `qa-smoke last run ${lastRun.id}`,
    `status: ${lastRun.status}`,
    `at: ${lastRun.startedAt.toISOString()}`,
    `summary: ${lastRun.finalSummary ?? lastRun.errorMessage ?? "(none)"}`,
  ].join("\n");
}

async function auditTail(agentKey: string | undefined): Promise<string> {
  const rows = await prisma.agentAuditLogEntry.findMany({
    where: agentKey ? { agentKey } : undefined,
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  if (rows.length === 0) {
    return `Audit: no entries${agentKey ? ` for ${agentKey}` : ""}.`;
  }
  const lines = rows.map(
    (row) =>
      `${row.createdAt.toISOString()} ${row.agentKey ?? "-"} ${row.hookPhase}${row.outcome ? ` [${row.outcome}]` : ""}`
  );
  return [`Audit (last ${rows.length}${agentKey ? ` for ${agentKey}` : ""}):`, ...lines].join("\n");
}

async function knowledgeQuery(query: string): Promise<string> {
  const q = query.trim();
  if (!q) {
    return "Usage: /knowledge <question>";
  }
  // The Internal Knowledge agent reads its query from PAT_KNOWLEDGE_QUERY and
  // returns the cited answer in its run summary (audited like every agent).
  process.env.PAT_KNOWLEDGE_QUERY = q;
  try {
    const outcome = await runAgentByKey("internal-knowledge", { trigger: "manual", triggerSource: "telegram" });
    return outcome.summary ?? outcome.error ?? "(no answer)";
  } finally {
    delete process.env.PAT_KNOWLEDGE_QUERY;
  }
}

function helpText(): string {
  return [
    "Commands:",
    "/status — agent health summary",
    "/queue — pending approvals",
    "/agents — registered agents + last run",
    "/qa run — trigger a QA smoke run",
    "/qa status — last QA run summary",
    "/knowledge <question> — search operational knowledge (cited)",
    "/audit [agent] — last 10 audit entries",
    "/help — this list",
  ].join("\n");
}
