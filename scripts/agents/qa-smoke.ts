// QA + Smoke Agent (Phase 1a). Hourly read-only health checks on production,
// implemented as planner → generator → evaluator:
//   - planner   (lib/agents/qa-smoke/planner): pick routes to probe this run
//   - generator (probeRoute below):            fetch each route via http_fetch
//   - evaluator (lib/agents/qa-smoke/evaluator): compare to expectations, decide drift
// On drift it sends a Telegram alert. It is strictly read-only: the only tools
// it can use are http_fetch (GET globs), neon.read (AgentRun/AgentAuditLogEntry),
// telegram.send_message, and vercel reads — enforced by the allowlist hook.
import prisma from "@/lib/prisma";
import { registerAgent } from "@/lib/agents/registry";
import { auditLog } from "@/lib/agents/audit";
import { planRoutes } from "@/lib/agents/qa-smoke/planner";
import {
  asRecord,
  buildFingerprintProbe,
  buildHealthProbe,
  buildSignInProbe,
  unreachableProbe,
} from "@/lib/agents/qa-smoke/probe";
import { decideAlert, evaluate } from "@/lib/agents/qa-smoke/evaluator";
import { buildTelegramSendPayload, sendTelegramMessage } from "@/lib/agents/telegram";
import { loadVerticalPack } from "@/lib/verticals/loader";
import type { AgentHandler, AgentRunContext } from "@/lib/agents/types";
import type { ProbeResult, RoutePlan } from "@/lib/agents/qa-smoke/types";

export const QA_SMOKE_KEY = "qa-smoke";
const DEFAULT_BASE_URL = "https://pat-c2acct-live.vercel.app";
const FETCH_TIMEOUT_MS = 15_000;
const QA_OBSERVED_MARKER = "qa-observed-commit";

const qaSmokeHandler: AgentHandler = async (ctx) => {
  const baseUrl = process.env.PAT_QA_BASE_URL ?? DEFAULT_BASE_URL;

  // Vertical Pack resolution (proof of pattern). QA is not vertical-aware
  // functionally; this just demonstrates loading the pack for the agent's
  // configured verticalId so every agent has a uniform pack-resolution path.
  const verticalId = ctx.config.vertical_id ?? "accounting";
  const pack = await loadVerticalPack(verticalId);
  await ctx.log("vertical pack loaded", {
    vertical: pack.id,
    version: pack.version,
    taxonomySource: pack.taxonomy.source,
  });

  // PLANNER
  const plan = planRoutes(baseUrl);
  await ctx.log("planner selected routes", { routes: plan.map((p) => p.route), baseUrl });

  // Expected commit: explicit env override, else last good run's baseline, else
  // none (first run establishes the baseline; no commit drift on a cold start).
  const expectedCommit = await resolveExpectedCommit(ctx);

  // GENERATOR
  const probes: ProbeResult[] = [];
  for (const route of plan) {
    probes.push(await probeRoute(ctx, route));
  }

  // EVALUATOR
  const evaluation = evaluate(probes, { expectedCommit, signInGithubButtonAllowed: false });
  const alert = decideAlert(evaluation);
  await ctx.log("evaluation complete", {
    drift: evaluation.drift,
    findings: evaluation.findings.map((f) => f.code),
    expectedCommit,
  });

  // Record the observed commit so the next run can baseline against it. This
  // lands in the agent's own audit trail (within the neon read scope), not a
  // production write.
  const fingerprint = probes.find((p) => p.route === "release-fingerprint");
  if (fingerprint?.commitShort) {
    await auditLog({
      runId: ctx.runId,
      agentKey: ctx.agentKey,
      hookPhase: "agent_message",
      payload: {
        marker: QA_OBSERVED_MARKER,
        commitShort: fingerprint.commitShort,
        releaseId: fingerprint.releaseId,
      },
    });
  }

  if (alert.shouldAlert) {
    await sendAlert(ctx, alert.message);
  }

  const summary = alert.shouldAlert
    ? `QA drift: ${evaluation.findings.length} finding(s) — ${evaluation.findings
        .map((f) => f.code)
        .join(", ")}. Telegram alert dispatched.`
    : `QA green: ${plan.map((p) => p.route).join(", ")} healthy${
        expectedCommit ? ` at commit ${expectedCommit}` : " (no baseline commit yet)"
      }.`;
  return { summary };
};

async function probeRoute(ctx: AgentRunContext, route: RoutePlan): Promise<ProbeResult> {
  return ctx.useTool(
    "http_fetch.get",
    { method: "GET", url: route.url, route: route.route },
    async () => {
      try {
        const response = await fetchWithTimeout(route.url, FETCH_TIMEOUT_MS);
        if (route.route === "sign-in") {
          const html = await response.text();
          return buildSignInProbe(route.url, response.status, html);
        }
        const releaseHeader = response.headers.get("x-pat-release-id");
        const body = await safeJson(response);
        if (route.route === "health-db") {
          return buildHealthProbe(route.url, response.status, body);
        }
        return buildFingerprintProbe(route.url, response.status, body, releaseHeader);
      } catch (error) {
        return unreachableProbe(
          route.route,
          route.url,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  );
}

async function resolveExpectedCommit(ctx: AgentRunContext): Promise<string | null> {
  const override = process.env.PAT_QA_EXPECTED_COMMIT?.trim();
  if (override) {
    return override;
  }

  const baseline = await ctx.useTool(
    "neon.read",
    { table: "AgentAuditLogEntry", purpose: "baseline-commit" },
    async () => {
      const prior = await prisma.agentAuditLogEntry.findFirst({
        where: {
          agentKey: ctx.agentKey,
          hookPhase: "agent_message",
          payload: { path: ["marker"], equals: QA_OBSERVED_MARKER },
        },
        orderBy: { createdAt: "desc" },
      });
      const payload = asRecord(prior?.payload);
      const commitShort = typeof payload?.commitShort === "string" ? payload.commitShort : null;
      return { commitShort, source: prior ? "prior-run" : "none" };
    }
  );

  return baseline.commitShort;
}

async function sendAlert(ctx: AgentRunContext, message: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID ?? "";
  const dryRun = process.env.PAT_QA_ALERT_DRYRUN === "1";

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

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

registerAgent(QA_SMOKE_KEY, qaSmokeHandler);
