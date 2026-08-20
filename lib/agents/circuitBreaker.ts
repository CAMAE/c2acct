import prisma from "@/lib/prisma";
import { auditLog } from "./audit";
import type { AgentConfig } from "./config";

/**
 * Per-agent circuit breaker (S4).
 *
 * `limits.circuit_breaker` has been in the config schema — and in qa-smoke.yaml —
 * since Phase 1, validated by zod and then read by nothing. An agent whose
 * dependency was down retried on its cadence forever, burning budget and filling
 * the audit log with identical failures.
 *
 * State is DERIVED from AgentRun rows rather than stored, using the existing
 * `@@index([agentKey, startedAt desc])`:
 *   - CLOSED   — the last `consecutive_failures` terminal runs are not all
 *                failures. Normal scheduling.
 *   - OPEN     — they are. A marker run with status `circuit_open` is written
 *                (which is what /admin renders) and scheduling is skipped until
 *                `cooldown_minutes` has elapsed since that marker.
 *   - HALF_OPEN— the cooldown has elapsed. Exactly one probe run is allowed
 *                through. If it succeeds the failure streak is broken and the
 *                breaker closes on its own; if it fails the streak is intact,
 *                a fresh marker is written, and the cooldown restarts.
 *
 * Deriving instead of storing means the breaker cannot drift out of sync with
 * the run history an operator is actually looking at.
 */

/** Applied when a config omits `circuit_breaker`. On by default, not off. */
export const DEFAULT_BREAKER = { consecutive_failures: 3, cooldown_minutes: 30 } as const;

/** Terminal statuses that count as a failure for the streak. */
const FAILURE_STATUSES = ["failed", "timeout", "budget_exceeded"] as const;
/** Terminal statuses that break a failure streak. */
const SUCCESS_STATUSES = ["completed"] as const;

export type BreakerState = "closed" | "open" | "half_open";

export interface BreakerVerdict {
  state: BreakerState;
  /** Whether a run may start now. */
  allowed: boolean;
  consecutiveFailures: number;
  threshold: number;
  reason?: string;
  /** When the breaker will next allow a probe (open state only). */
  retryAt?: Date;
}

function settingsFor(config: AgentConfig) {
  return config.limits.circuit_breaker ?? DEFAULT_BREAKER;
}

/**
 * Consecutive failures at the head of this agent's run history. Only terminal
 * outcomes are considered — `running` and `paused_approval` are in-flight, and
 * `circuit_open` markers are the breaker's own bookkeeping, not agent outcomes.
 */
export async function consecutiveFailures(agentKey: string, limit: number): Promise<number> {
  const recent = await prisma.agentRun.findMany({
    where: { agentKey, status: { in: [...FAILURE_STATUSES, ...SUCCESS_STATUSES] } },
    orderBy: { startedAt: "desc" },
    take: limit,
    select: { status: true },
  });

  let streak = 0;
  for (const run of recent) {
    if ((FAILURE_STATUSES as readonly string[]).includes(String(run.status))) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

/** The most recent circuit_open marker for this agent, if any. */
async function lastOpenMarker(agentKey: string): Promise<{ startedAt: Date } | null> {
  const row = await prisma.agentRun.findFirst({
    where: { agentKey, status: "circuit_open" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true },
  });
  return row ? { startedAt: row.startedAt as Date } : null;
}

/** The newest terminal (non-marker) run started strictly after `after`. */
async function newestTerminalRunAfter(
  agentKey: string,
  after: Date
): Promise<{ status: string; startedAt: Date } | null> {
  const row = await prisma.agentRun.findFirst({
    where: {
      agentKey,
      status: { in: [...FAILURE_STATUSES, ...SUCCESS_STATUSES] },
      startedAt: { gte: new Date(after.getTime() + 1) },
    },
    orderBy: { startedAt: "desc" },
    select: { status: true, startedAt: true },
  });
  return row ? { status: String(row.status), startedAt: row.startedAt as Date } : null;
}

/**
 * Should this agent be allowed to run right now? Called from the scheduler gate
 * before every scheduled fire.
 */
export async function checkBreaker(config: AgentConfig, now = new Date()): Promise<BreakerVerdict> {
  const settings = settingsFor(config);
  const threshold = settings.consecutive_failures;
  const cooldownMs = settings.cooldown_minutes * 60 * 1000;

  const streak = await consecutiveFailures(config.key, threshold);

  if (streak < threshold) {
    return { state: "closed", allowed: true, consecutiveFailures: streak, threshold };
  }

  // The streak is at threshold. Is a cooldown already running?
  const marker = await lastOpenMarker(config.key);
  if (marker) {
    const elapsed = now.getTime() - marker.startedAt.getTime();
    if (elapsed < cooldownMs) {
      return {
        state: "open",
        allowed: false,
        consecutiveFailures: streak,
        threshold,
        reason: `circuit open after ${streak} consecutive failures; cooling down`,
        retryAt: new Date(marker.startedAt.getTime() + cooldownMs),
      };
    }
    // Cooldown elapsed. Did a probe already run against this marker?
    const probe = await newestTerminalRunAfter(config.key, marker.startedAt);
    if (probe && (FAILURE_STATUSES as readonly string[]).includes(String(probe.status))) {
      // The probe ran and failed. Without this branch the breaker would report
      // half_open on EVERY subsequent tick — the stale marker stays past its
      // cooldown forever — which is the flapping the breaker exists to prevent.
      // Write a fresh marker so the cooldown restarts from the failed probe.
      await openCircuit(config, streak, now);
      return {
        state: "open",
        allowed: false,
        consecutiveFailures: streak,
        threshold,
        reason: "half-open probe failed; cooldown restarted",
        retryAt: new Date(now.getTime() + cooldownMs),
      };
    }

    // Cooldown elapsed and no probe has run yet → let exactly one through.
    return {
      state: "half_open",
      allowed: true,
      consecutiveFailures: streak,
      threshold,
      reason: "cooldown elapsed; allowing a half-open probe",
    };
  }

  // Streak just reached the threshold and no marker exists yet: open it now.
  await openCircuit(config, streak, now);
  return {
    state: "open",
    allowed: false,
    consecutiveFailures: streak,
    threshold,
    reason: `circuit opened after ${streak} consecutive failures`,
    retryAt: new Date(now.getTime() + cooldownMs),
  };
}

/**
 * Write the `circuit_open` marker run. This is what makes the state visible in
 * /admin (adminConsole renders AgentRun.status), and it is also the timestamp
 * the cooldown is measured from.
 */
export async function openCircuit(
  config: AgentConfig,
  streak: number,
  now = new Date()
): Promise<string> {
  const run = await prisma.agentRun.create({
    data: {
      agentKey: config.key,
      trigger: "scheduled",
      triggerSource: "circuit-breaker",
      status: "circuit_open",
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
      errorClass: "circuit_open",
      errorMessage: `${streak} consecutive failures; scheduling suspended for ${settingsFor(config).cooldown_minutes} min`,
      finalSummary: `Circuit opened after ${streak} consecutive failures.`,
    },
  });

  await auditLog({
    runId: run.id,
    agentKey: config.key,
    hookPhase: "agent_message",
    payload: {
      circuit: "open",
      consecutiveFailures: streak,
      cooldownMinutes: settingsFor(config).cooldown_minutes,
    },
    outcome: "blocked",
  });

  return run.id;
}
