import prisma from "@/lib/prisma";
import { toJsonValue } from "./json";

/**
 * Production trigger queue (Phase 2.5 #5).
 *
 * The /admin command bar runs on Vercel, but agents execute on the Mac mini
 * supervisor — a different machine. In production the run endpoint cannot
 * spawn a process; instead it enqueues an AgentTriggerRequest row here and the
 * supervisor claims it on its poll loop (see scripts/agents/supervisor.ts).
 *
 * Claim semantics: single-consumer (one supervisor), but claims are still
 * guarded with a conditional updateMany so a second consumer can never run the
 * same trigger twice. Pending triggers older than TRIGGER_TTL_MS are expired
 * rather than run, so a supervisor outage does not replay a backlog of stale
 * commands when it comes back up.
 *
 * Two hardening rules apply at THIS layer, not at the caller's (S5/S7):
 *   - taskEnv is allowlisted here. The queue is the trust boundary between the
 *     /admin command bar (Vercel) and the supervisor's process env; a caller
 *     must not be able to set an arbitrary environment variable on the agent
 *     process by naming it in a trigger row.
 *   - Stale CLAIMED rows are expired too, not just pending ones. A supervisor
 *     that dies mid-run leaves its claim behind forever otherwise.
 */

/** Pending triggers older than this are expired, not run (default 15 min). */
const TRIGGER_TTL_MS = Number(process.env.PAT_TRIGGER_TTL_MS ?? 15 * 60 * 1000);

/**
 * A claimed trigger whose supervisor never finished it is orphaned after this
 * long (default 60 min) and released back to `expired`. Longer than the pending
 * TTL because a claim means a run genuinely started.
 */
const CLAIM_TTL_MS = Number(process.env.PAT_TRIGGER_CLAIM_TTL_MS ?? 60 * 60 * 1000);

/**
 * Environment variables a trigger may set on the supervisor process. Anything
 * else in taskEnv is dropped (and reported) rather than exported — deny by
 * default, so a compromised or careless caller cannot inject DATABASE_URL,
 * ANTHROPIC_API_KEY, NODE_OPTIONS, PATH, or any other lever into the agent
 * process. Add a key here deliberately when an agent needs a new task input.
 */
export const ALLOWED_TASK_ENV_KEYS: ReadonlySet<string> = new Set([
  "PAT_PILOT_TASK",
  "PAT_KNOWLEDGE_QUERY",
  "PAT_QA_TARGET",
  "PAT_AGENT_NOTE",
]);

export interface TaskEnvFilterResult {
  allowed: Record<string, string>;
  rejected: string[];
}

/** Split a taskEnv map into the allowlisted entries and the rejected key names. */
export function filterTaskEnv(raw: unknown): TaskEnvFilterResult {
  const allowed: Record<string, string> = {};
  const rejected: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { allowed, rejected };
  }
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value !== "string") {
      rejected.push(key);
      continue;
    }
    if (!ALLOWED_TASK_ENV_KEYS.has(key)) {
      rejected.push(key);
      continue;
    }
    allowed[key] = value;
  }
  return { allowed, rejected };
}

export interface EnqueueTriggerInput {
  agentKey: string;
  message?: string | null;
  /** Per-run env overrides, e.g. { PAT_PILOT_TASK: "draft-invitation" }. */
  taskEnv?: Record<string, string> | null;
  requestedBy?: string | null;
  /** Resume an approval-paused run under its original id (S1). */
  resumeRunId?: string | null;
}

export interface ClaimedTrigger {
  id: string;
  agentKey: string;
  message: string | null;
  taskEnv: Record<string, string>;
  requestedBy: string | null;
  resumeRunId: string | null;
  createdAt: Date;
}

export async function enqueueTrigger(input: EnqueueTriggerInput): Promise<{ id: string }> {
  // Filter on the way IN as well as on the way out, so a rejected key never even
  // lands in the row an operator reads in /admin.
  const { allowed } = filterTaskEnv(input.taskEnv ?? null);
  const row = await prisma.agentTriggerRequest.create({
    data: {
      agentKey: input.agentKey,
      message: input.message ?? null,
      taskEnv: Object.keys(allowed).length > 0 ? toJsonValue(allowed) : undefined,
      requestedBy: input.requestedBy ?? null,
      resumeRunId: input.resumeRunId ?? null,
    },
    select: { id: true },
  });
  return row;
}

/**
 * Claim the oldest fresh pending trigger. Returns null when the queue is empty.
 * Stale pending rows are marked expired as a side effect.
 */
export async function claimNextTrigger(): Promise<ClaimedTrigger | null> {
  await expireStaleTriggers();

  const candidate = await prisma.agentTriggerRequest.findFirst({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
  });
  if (!candidate) return null;

  // Conditional claim: only wins if the row is still pending.
  const claimed = await prisma.agentTriggerRequest.updateMany({
    where: { id: candidate.id, status: "pending" },
    data: { status: "claimed", claimedAt: new Date() },
  });
  if (claimed.count !== 1) return null; // lost the race; next poll retries

  // Allowlist again at claim time: rows written before this guard existed (or by
  // any other writer) must not be able to set arbitrary env on the supervisor.
  const { allowed: taskEnv, rejected } = filterTaskEnv(candidate.taskEnv);
  if (rejected.length > 0) {
    console.warn(
      `[triggerQueue] trigger ${candidate.id} (${candidate.agentKey}): dropped non-allowlisted taskEnv key(s): ${rejected.join(", ")}`
    );
  }

  return {
    id: candidate.id,
    agentKey: candidate.agentKey,
    message: candidate.message,
    taskEnv,
    requestedBy: candidate.requestedBy,
    resumeRunId: candidate.resumeRunId,
    createdAt: candidate.createdAt,
  };
}

/**
 * Expire triggers that can no longer legitimately run: pending rows older than
 * the pending TTL, and CLAIMED rows whose supervisor never finished them. The
 * claimed sweep is the half that was missing — without it a process killed
 * mid-run leaves its claim in place forever and the row is never retried or
 * surfaced. Both updates are conditional on the status they expect, so a live
 * supervisor finishing normally always wins.
 */
export async function expireStaleTriggers(now = new Date()): Promise<{ pending: number; claimed: number }> {
  const pendingCutoff = new Date(now.getTime() - TRIGGER_TTL_MS);
  const claimedCutoff = new Date(now.getTime() - CLAIM_TTL_MS);

  const pending = await prisma.agentTriggerRequest.updateMany({
    where: { status: "pending", createdAt: { lt: pendingCutoff } },
    data: { status: "expired", finishedAt: now, error: "expired before claim (supervisor offline?)" },
  });

  const claimed = await prisma.agentTriggerRequest.updateMany({
    where: { status: "claimed", claimedAt: { lt: claimedCutoff } },
    data: {
      status: "expired",
      finishedAt: now,
      error: "claimed but never completed (supervisor died mid-run?)",
    },
  });

  return { pending: pending.count, claimed: claimed.count };
}

export async function completeTrigger(id: string, runId: string | null): Promise<void> {
  await prisma.agentTriggerRequest.update({
    where: { id },
    data: { status: "completed", finishedAt: new Date(), runId },
  });
}

export async function failTrigger(id: string, error: string, runId?: string | null): Promise<void> {
  await prisma.agentTriggerRequest.update({
    where: { id },
    data: { status: "failed", finishedAt: new Date(), error: error.slice(0, 2000), runId: runId ?? undefined },
  });
}
