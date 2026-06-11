import prisma from "@/lib/prisma";
import { loadAgentConfigs } from "@/lib/agents/config";
import { runAgentByKey } from "@/lib/agents/sdk";
import { enqueueTrigger } from "@/lib/agents/triggerQueue";
import { validateProvisionAccountRequest } from "@/lib/provisioning/account";

const AGENTS_DIR = "agents";

/** Dispatch a slash command to its handler. Returns the text reply. */
export async function handleCommand(text: string, requestedBy?: string): Promise<string> {
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
    case "/provision":
      return provisionCommand(args.join(" "), requestedBy);
    case "/audit":
      return auditTail(args[0]);
    case "/help":
      return helpText();
    default:
      return `Unknown command ${command}.\n\n${helpText()}`;
  }
}

export interface ParsedProvisionCommand {
  ok: boolean;
  error?: string;
  orgKind?: string;
  ownerEmail?: string;
  orgName?: string;
  ownerName?: string;
}

const PROVISION_USAGE =
  'Usage: /provision <firm|vendor> <owner-email> <Org Name> [| Owner Name]\nExample: /provision firm jane@acmecpa.com Acme CPA Group | Jane Smith';

/**
 * Parse "/provision firm jane@acme.com Acme CPA Group | Jane Smith" args.
 * Org name is everything after the email; an optional " | " suffix names the owner.
 */
export function parseProvisionCommand(argsText: string): ParsedProvisionCommand {
  const trimmed = argsText.trim();
  if (!trimmed) {
    return { ok: false, error: PROVISION_USAGE };
  }
  const [head, rest] = splitOnce(trimmed);
  const orgKind = head.toLowerCase();
  const [email, nameText] = splitOnce(rest);
  const [orgNameRaw, ownerNameRaw] = nameText.split("|", 2);

  const candidate = {
    orgKind,
    ownerEmail: email,
    orgName: orgNameRaw?.trim() ?? "",
    ownerName: ownerNameRaw?.trim() || undefined,
  };
  const validation = validateProvisionAccountRequest({
    orgKind: candidate.orgKind,
    orgName: candidate.orgName,
    ownerEmail: candidate.ownerEmail,
  });
  if (!validation.ok) {
    return { ok: false, error: `${validation.message}\n\n${PROVISION_USAGE}` };
  }
  return {
    ok: true,
    orgKind: validation.orgKind,
    ownerEmail: validation.ownerEmail,
    orgName: validation.orgName,
    ownerName: candidate.ownerName,
  };
}

function splitOnce(text: string): [string, string] {
  const match = text.match(/^(\S+)\s*([\s\S]*)$/);
  return match ? [match[1], match[2]] : [text, ""];
}

/**
 * /provision — enqueue an approval-gated Pilot Ops provisioning run. The bot
 * must NOT run the agent inline: the run blocks on the approval card, and this
 * same process handles the card's callback — running inline would deadlock.
 * The supervisor claims the trigger from the queue instead.
 */
async function provisionCommand(argsText: string, requestedBy?: string): Promise<string> {
  const parsed = parseProvisionCommand(argsText);
  if (!parsed.ok) {
    return parsed.error ?? PROVISION_USAGE;
  }

  const taskEnv: Record<string, string> = {
    PAT_PILOT_TASK: "provision-account",
    PAT_PROVISION_ORG_KIND: parsed.orgKind!,
    PAT_PROVISION_ORG_NAME: parsed.orgName!,
    PAT_PROVISION_OWNER_EMAIL: parsed.ownerEmail!,
  };
  if (parsed.ownerName) {
    taskEnv.PAT_PROVISION_OWNER_NAME = parsed.ownerName;
  }

  const { id } = await enqueueTrigger({
    agentKey: "pilot-ops",
    message: `provision ${parsed.orgKind} ${parsed.orgName} (${parsed.ownerEmail})`,
    taskEnv,
    requestedBy: requestedBy ?? "telegram",
  });

  return [
    `Queued provisioning of ${parsed.orgKind} "${parsed.orgName}" with owner ${parsed.ownerEmail} (trigger ${id}).`,
    "The supervisor will pick it up and send an approval card here — nothing is created until you approve.",
  ].join("\n");
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
    "/provision <firm|vendor> <owner-email> <Org Name> [| Owner Name] — provision an org + owner (approval-gated)",
    "/audit [agent] — last 10 audit entries",
    "/help — this list",
  ].join("\n");
}
