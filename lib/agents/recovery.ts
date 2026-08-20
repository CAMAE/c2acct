import prisma from "@/lib/prisma";
import { auditLog } from "./audit";
import { DEFAULT_APPROVAL_TTL_MS, expireStaleApprovals } from "./approvals";
import { expireStaleTriggers } from "./triggerQueue";
import type { AgentConfig } from "./config";

/**
 * Orphan recovery boot sweep (S5).
 *
 * Every crash, kill -9, launchd restart, or DB outage mid-run leaves rows that
 * describe work nobody is doing any more: an AgentRun stuck in `running`, a run
 * parked in `paused_approval` behind a card nobody will ever tap, a trigger
 * `claimed` by a process that no longer exists. Nothing previously cleaned any
 * of them up, so the console showed phantom in-flight work indefinitely and the
 * per-agent overlap guard had no truthful state to read.
 *
 * The sweep runs once at supervisor start, before anything is scheduled. It is
 * deliberately conservative: every write is conditional on the status it
 * expects, and a run is only failed once it is past its OWN cap plus a margin —
 * so a run legitimately still executing on another supervisor is never killed.
 */

/** Grace added to an agent's runtime cap before its run is declared orphaned. */
export const ORPHAN_MARGIN_MS = Number(process.env.PAT_ORPHAN_MARGIN_MS ?? 5 * 60 * 1000);

export interface SweepResult {
  failedRunning: number;
  failedPaused: number;
  expiredApprovals: number;
  expiredPendingTriggers: number;
  expiredClaimedTriggers: number;
}

/**
 * Fail runs that cannot still be alive, expire the approvals and triggers that
 * outlived their window, and report what was cleaned.
 */
export async function bootSweep(
  configs: AgentConfig[],
  now = new Date()
): Promise<SweepResult> {
  const result: SweepResult = {
    failedRunning: 0,
    failedPaused: 0,
    expiredApprovals: 0,
    expiredPendingTriggers: 0,
    expiredClaimedTriggers: 0,
  };

  // --- 1. Runs stuck in `running` past their own cap + margin ---------------
  // Per-agent, because max_runtime_seconds differs per config; a shared cutoff
  // would either spare slow agents or kill fast ones early.
  for (const config of configs) {
    const cutoff = new Date(now.getTime() - (config.limits.max_runtime_seconds * 1000 + ORPHAN_MARGIN_MS));
    const stuck = await prisma.agentRun.updateMany({
      where: { agentKey: config.key, status: "running", startedAt: { lt: cutoff } },
      data: {
        status: "timeout",
        finishedAt: now,
        errorClass: "orphaned",
        errorMessage: "run was still marked running at supervisor start; no process owns it",
      },
    });
    result.failedRunning += stuck.count;
  }

  // Runs for agents whose config is no longer loaded would otherwise be
  // unreachable by the loop above. Use the most generous cap seen plus margin
  // so a still-live run of a *loaded* agent is never caught here.
  const widestCapMs = configs.reduce(
    (widest, config) => Math.max(widest, config.limits.max_runtime_seconds * 1000),
    0
  );
  const orphanCutoff = new Date(now.getTime() - (widestCapMs + ORPHAN_MARGIN_MS));
  const unknownAgentRuns = await prisma.agentRun.updateMany({
    where: {
      status: "running",
      startedAt: { lt: orphanCutoff },
      agentKey: { notIn: configs.map((config) => config.key) },
    },
    data: {
      status: "timeout",
      finishedAt: now,
      errorClass: "orphaned",
      errorMessage: "run belongs to an agent this supervisor does not load; no process owns it",
    },
  });
  result.failedRunning += unknownAgentRuns.count;

  // --- 2. Runs parked on an approval nobody answered ------------------------
  // A paused run is legitimately long-lived, so it is only reaped once its
  // approval window has fully lapsed.
  const pausedCutoff = new Date(now.getTime() - (DEFAULT_APPROVAL_TTL_MS + ORPHAN_MARGIN_MS));
  const abandoned = await prisma.agentRun.updateMany({
    where: { status: "paused_approval", startedAt: { lt: pausedCutoff } },
    data: {
      status: "failed",
      finishedAt: now,
      errorClass: "approval_abandoned",
      errorMessage: "approval was never decided within the approval TTL",
    },
  });
  result.failedPaused = abandoned.count;

  // --- 3. Approvals and triggers past their windows -------------------------
  result.expiredApprovals = await expireStaleApprovals(DEFAULT_APPROVAL_TTL_MS, now);
  const triggers = await expireStaleTriggers(now);
  result.expiredPendingTriggers = triggers.pending;
  result.expiredClaimedTriggers = triggers.claimed;

  const cleaned =
    result.failedRunning +
    result.failedPaused +
    result.expiredApprovals +
    result.expiredPendingTriggers +
    result.expiredClaimedTriggers;

  if (cleaned > 0) {
    await auditLog({
      hookPhase: "agent_message",
      payload: { sweep: "boot_orphan_recovery", ...result },
      outcome: "allowed",
    });
  }

  return result;
}

/**
 * Agent keys that currently have a live run. The supervisor's overlap guard
 * reads this at boot to seed itself, so a run left behind by a previous process
 * cannot be double-started.
 */
export async function agentsWithLiveRuns(): Promise<string[]> {
  const rows = await prisma.agentRun.findMany({
    where: { status: { in: ["running"] } },
    select: { agentKey: true },
  });
  return [...new Set(rows.map((row) => String(row.agentKey)))];
}
