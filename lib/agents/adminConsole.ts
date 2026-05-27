import prisma from "@/lib/prisma";
import { loadAgentConfigs } from "./config";
import { cronMatches } from "./cron";
import type { AgentConfig } from "./config";

// Server-side data for the /admin agent ops console. Reads Neon directly (the
// pages are server components); the live components poll the GET routes that
// wrap these same helpers.

const AGENTS_DIR = "agents";
const DAY_MS = 24 * 60 * 60 * 1000;
const SPARKLINE_BUCKETS = 24;
const ERROR_STATUSES = new Set(["failed", "timeout", "budget_exceeded", "circuit_open"]);

export type AgentHealth = "healthy" | "warning" | "error" | "idle";

export interface AgentOverview {
  key: string;
  name: string;
  enabled: boolean;
  lastRunStatus: string | null;
  lastRunAt: string | null;
  runs24h: number;
  sparkline: number[];
  pendingApprovals: number;
  scheduleLabel: string;
  nextScheduled: string | null;
  health: AgentHealth;
}

export interface ApprovalView {
  id: string;
  agentKey: string;
  proposedAction: string;
  blastRadius: string | null;
  rationale: string | null;
  proposedArgs: unknown;
  status: string;
  createdAt: string;
}

export interface AuditView {
  id: string;
  agentKey: string | null;
  runId: string | null;
  hookPhase: string;
  outcome: string | null;
  payload: unknown;
  createdAt: string;
}

export interface RunView {
  id: string;
  agentKey: string;
  trigger: string;
  triggerSource: string | null;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  finalSummary: string | null;
  errorMessage: string | null;
}

export interface HealthBanner {
  total: number;
  healthy: number;
  enabled: number;
  pendingApprovals: number;
  lastEventAt: string | null;
  lastEventSummary: string | null;
}

function scheduleLabel(config: AgentConfig): string {
  const s = config.schedule;
  if (s.type === "cron") return `cron ${s.expression ?? "?"}`;
  if (s.type === "interval") return `every ${s.every_seconds ?? "?"}s`;
  return "manual";
}

/** Next cron fire from now, scanning forward up to 7 days (display only). */
function nextCronFire(config: AgentConfig): string | null {
  const s = config.schedule;
  if (s.type !== "cron" || !s.expression || !config.enabled) return null;
  const cursor = new Date();
  cursor.setSeconds(0, 0);
  for (let i = 1; i <= 7 * 24 * 60; i += 1) {
    cursor.setMinutes(cursor.getMinutes() + 1);
    if (cronMatches(s.expression, cursor)) return cursor.toISOString();
  }
  return null;
}

function hourlyBuckets(dates: Date[], sinceMs: number): number[] {
  const buckets = new Array<number>(SPARKLINE_BUCKETS).fill(0);
  for (const date of dates) {
    const idx = Math.min(
      SPARKLINE_BUCKETS - 1,
      Math.max(0, Math.floor((date.getTime() - sinceMs) / (DAY_MS / SPARKLINE_BUCKETS)))
    );
    buckets[idx] += 1;
  }
  return buckets;
}

function deriveHealth(config: AgentConfig, lastStatus: string | null, pending: number): AgentHealth {
  if (!config.enabled) return "idle";
  if (lastStatus && ERROR_STATUSES.has(lastStatus)) return "error";
  if (pending > 0 || lastStatus === "awaiting_approval") return "warning";
  return "healthy";
}

export async function getAgentsOverview(): Promise<AgentOverview[]> {
  const configs = await loadAgentConfigs(AGENTS_DIR);
  const sinceMs = Date.now() - DAY_MS;
  const since = new Date(sinceMs);

  const overviews = await Promise.all(
    configs.map(async (config) => {
      const [lastRun, runs, pending] = await Promise.all([
        prisma.agentRun.findFirst({ where: { agentKey: config.key }, orderBy: { startedAt: "desc" } }),
        prisma.agentRun.findMany({
          where: { agentKey: config.key, startedAt: { gte: since } },
          select: { startedAt: true },
        }),
        prisma.agentApproval.count({ where: { agentKey: config.key, status: "pending" } }),
      ]);
      return {
        key: config.key,
        name: config.name,
        enabled: config.enabled,
        lastRunStatus: lastRun?.status ?? null,
        lastRunAt: lastRun?.startedAt.toISOString() ?? null,
        runs24h: runs.length,
        sparkline: hourlyBuckets(runs.map((r) => r.startedAt), sinceMs),
        pendingApprovals: pending,
        scheduleLabel: scheduleLabel(config),
        nextScheduled: nextCronFire(config),
        health: deriveHealth(config, lastRun?.status ?? null, pending),
      } satisfies AgentOverview;
    })
  );

  return overviews.sort((a, b) => a.key.localeCompare(b.key));
}

export async function getAgentConfig(key: string): Promise<AgentConfig | null> {
  const configs = await loadAgentConfigs(AGENTS_DIR);
  return configs.find((c) => c.key === key) ?? null;
}

export async function getPendingApprovals(): Promise<ApprovalView[]> {
  const rows = await prisma.agentApproval.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((row) => ({
    id: row.id,
    agentKey: row.agentKey,
    proposedAction: row.proposedAction,
    blastRadius: row.blastRadius,
    rationale: row.rationale,
    proposedArgs: row.proposedArgs,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function getRecentAudit(limit = 20, agentKey?: string): Promise<AuditView[]> {
  const rows = await prisma.agentAuditLogEntry.findMany({
    where: agentKey ? { agentKey } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toAuditView);
}

/** Audit rows newer than the cursor (ISO), oldest-first — for the SSE stream. */
export async function getAuditSince(sinceIso: string | null, agentKey?: string, limit = 50): Promise<AuditView[]> {
  const where = {
    ...(agentKey ? { agentKey } : {}),
    ...(sinceIso ? { createdAt: { gt: new Date(sinceIso) } } : {}),
  };
  const rows = await prisma.agentAuditLogEntry.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  return rows.map(toAuditView);
}

function toAuditView(row: {
  id: string;
  agentKey: string | null;
  runId: string | null;
  hookPhase: string;
  outcome: string | null;
  payload: unknown;
  createdAt: Date;
}): AuditView {
  return {
    id: row.id,
    agentKey: row.agentKey,
    runId: row.runId,
    hookPhase: row.hookPhase,
    outcome: row.outcome,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getRunHistory(limit = 30, agentKey?: string): Promise<RunView[]> {
  const rows = await prisma.agentRun.findMany({
    where: agentKey ? { agentKey } : undefined,
    orderBy: { startedAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    id: row.id,
    agentKey: row.agentKey,
    trigger: row.trigger,
    triggerSource: row.triggerSource,
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
    durationMs: row.durationMs,
    finalSummary: row.finalSummary,
    errorMessage: row.errorMessage,
  }));
}

export async function getHealthBanner(): Promise<HealthBanner> {
  const overviews = await getAgentsOverview();
  const pendingApprovals = overviews.reduce((sum, o) => sum + o.pendingApprovals, 0);
  const lastEvent = await prisma.agentAuditLogEntry.findFirst({ orderBy: { createdAt: "desc" } });
  return {
    total: overviews.length,
    healthy: overviews.filter((o) => o.health === "healthy").length,
    enabled: overviews.filter((o) => o.enabled).length,
    pendingApprovals,
    lastEventAt: lastEvent?.createdAt.toISOString() ?? null,
    lastEventSummary: lastEvent ? `${lastEvent.agentKey ?? "-"} · ${lastEvent.hookPhase}` : null,
  };
}
