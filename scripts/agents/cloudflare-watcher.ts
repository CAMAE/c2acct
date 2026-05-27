// Cloudflare / Domain Watcher Agent (Phase 1c). ALERT-ONLY per Cam's locked
// decision #5: it watches patalign.com DNS + Cloudflare zone state, compares to
// the last-known snapshot, and pages Telegram on any change. It takes NO actions
// — no DNS changes, no Cloudflare writes, no forum posts. The allowlist
// (deny-by-default in canUseTool) restricts it to dig, cloudflare.read, and
// telegram.send_message; anything else is blocked.
//
// Each run: dig NS / A / www-A, optionally read the Cloudflare zone (no-op when
// no token), diff against the AgentState baseline, alert on change, then persist
// the new baseline. First run only records the baseline (no alert).
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { registerAgent } from "@/lib/agents/registry";
import { getAgentState, setAgentState } from "@/lib/agents/state";
import { decideAlert, diffState } from "@/lib/agents/cloudflare-watcher/evaluator";
import { buildTelegramSendPayload, sendTelegramMessage } from "@/lib/agents/telegram";
import type { AgentHandler, AgentRunContext } from "@/lib/agents/types";
import type { DnsSnapshot } from "@/lib/agents/cloudflare-watcher/types";

export const CLOUDFLARE_WATCHER_KEY = "cloudflare-watcher";
const STATE_KEY = "dns-snapshot";
const ZONE = "patalign.com";
const NS_CMD = "dig +short NS patalign.com";
const A_CMD = "dig +short A patalign.com";
const WWW_A_CMD = "dig +short A www.patalign.com";
const DIG_TIMEOUT_MS = 10_000;

const execFileAsync = promisify(execFile);

const cloudflareWatcherHandler: AgentHandler = async (ctx) => {
  // Gather current state through allowlisted tools.
  const ns = await digViaTool(ctx, NS_CMD);
  const a = await digViaTool(ctx, A_CMD);
  const wwwA = await digViaTool(ctx, WWW_A_CMD);
  const cloudflareZoneStatus = await readZoneViaTool(ctx);

  const current: DnsSnapshot = {
    ns,
    a,
    wwwA,
    cloudflareZoneStatus,
    capturedAt: new Date().toISOString(),
  };

  // Compare to the last-known snapshot (runtime state, not a tool).
  const previous = await getAgentState<DnsSnapshot>(ctx.agentKey, STATE_KEY);
  const evaluation = diffState(previous, current);
  const alert = decideAlert(evaluation);
  await ctx.log("state compared", {
    firstRun: evaluation.firstRun,
    changes: evaluation.changes.map((change) => change.code),
  });

  // Persist the new baseline for the next run.
  await setAgentState(ctx.agentKey, STATE_KEY, current);

  if (alert.shouldAlert) {
    await sendAlert(ctx, alert.message);
  }

  const stateLine = `ns=${ns.length}, a=${a.length}, www=${wwwA.length}, zone=${cloudflareZoneStatus ?? "n/a"}`;
  const summary = evaluation.firstRun
    ? `Cloudflare watcher: baseline captured (first run, no alert). ${stateLine}.`
    : evaluation.changed
      ? `Cloudflare watcher: ${evaluation.changes.length} change(s) — ${evaluation.changes
          .map((change) => change.code)
          .join(", ")}. Telegram alert dispatched.`
      : `Cloudflare watcher: no change. ${stateLine}.`;
  return { summary };
};

async function digViaTool(ctx: AgentRunContext, command: string): Promise<string[]> {
  return ctx.useTool("shell.exec", { command }, async (args) => {
    const parts = String(args.command).split(/\s+/);
    const [bin, ...rest] = parts;
    try {
      const { stdout } = await execFileAsync(bin, rest, { timeout: DIG_TIMEOUT_MS });
      return stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .sort();
    } catch {
      // dig failed (e.g. resolver hiccup); treat as no records this run.
      return [];
    }
  });
}

async function readZoneViaTool(ctx: AgentRunContext): Promise<string | null> {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    // Graceful no-op: no token, no tool call, no turn consumed.
    await ctx.log("cloudflare zone check skipped (no CLOUDFLARE_API_TOKEN)");
    return null;
  }

  return ctx.useTool("cloudflare.read", { zone: ZONE }, async () => {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones?name=${encodeURIComponent(ZONE)}`,
        { headers: { authorization: `Bearer ${token}` } }
      );
      const body: unknown = await response.json();
      return extractZoneStatus(body);
    } catch {
      return null;
    }
  });
}

function extractZoneStatus(body: unknown): string | null {
  const record = asRecord(body);
  const result = record?.result;
  if (!Array.isArray(result) || result.length === 0) {
    return null;
  }
  const zone = asRecord(result[0]);
  return typeof zone?.status === "string" ? zone.status : null;
}

async function sendAlert(ctx: AgentRunContext, message: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID ?? "";
  const dryRun = process.env.PAT_CW_ALERT_DRYRUN === "1";

  await ctx.useTool("telegram.send_message", { chatId, text: message, dryRun }, async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !chatId) {
      return { sent: false, reason: "telegram env not configured" };
    }
    if (dryRun) {
      return { sent: false, dryRun: true };
    }
    return sendTelegramMessage(token, buildTelegramSendPayload(chatId, message));
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

registerAgent(CLOUDFLARE_WATCHER_KEY, cloudflareWatcherHandler);
