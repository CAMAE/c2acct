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
 */

/** Pending triggers older than this are expired, not run (default 15 min). */
const TRIGGER_TTL_MS = Number(process.env.PAT_TRIGGER_TTL_MS ?? 15 * 60 * 1000);

export interface EnqueueTriggerInput {
  agentKey: string;
  message?: string | null;
  /** Per-run env overrides, e.g. { PAT_PILOT_TASK: "draft-invitation" }. */
  taskEnv?: Record<string, string> | null;
  requestedBy?: string | null;
}

export interface ClaimedTrigger {
  id: string;
  agentKey: string;
  message: string | null;
  taskEnv: Record<string, string>;
  requestedBy: string | null;
  createdAt: Date;
}

export async function enqueueTrigger(input: EnqueueTriggerInput): Promise<{ id: string }> {
  const row = await prisma.agentTriggerRequest.create({
    data: {
      agentKey: input.agentKey,
      message: input.message ?? null,
      taskEnv: input.taskEnv ? toJsonValue(input.taskEnv) : undefined,
      requestedBy: input.requestedBy ?? null,
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
  const staleCutoff = new Date(Date.now() - TRIGGER_TTL_MS);

  // Expire stale pendings first so they are never claimed.
  await prisma.agentTriggerRequest.updateMany({
    where: { status: "pending", createdAt: { lt: staleCutoff } },
    data: { status: "expired", finishedAt: new Date(), error: "expired before claim (supervisor offline?)" },
  });

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

  const taskEnv =
    candidate.taskEnv && typeof candidate.taskEnv === "object" && !Array.isArray(candidate.taskEnv)
      ? Object.fromEntries(
          Object.entries(candidate.taskEnv as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string"
          )
        )
      : {};

  return {
    id: candidate.id,
    agentKey: candidate.agentKey,
    message: candidate.message,
    taskEnv,
    requestedBy: candidate.requestedBy,
    createdAt: candidate.createdAt,
  };
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
