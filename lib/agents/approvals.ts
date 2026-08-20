import prisma from "@/lib/prisma";
import { toJsonValue } from "./json";
import { auditLog } from "./audit";
import { idempotencyKeyFor } from "./idempotency";
import { sendApprovalToTelegram } from "@/ops/telegram-bot/approvals";
import type { ToolArgs } from "./types";

/**
 * Approval gate — async pause/resume (S1/S2). Replaces the 24h in-run poll.
 *
 * The old shape blocked the agent process inside `requestApproval`, polling the
 * row every 5s for up to 24 hours. That burned the run's max_runtime_seconds on
 * human latency, held a supervisor slot hostage, and raced the timeout writer.
 *
 * The new shape never blocks:
 *   1. A gated call resolves (or creates) an AgentApproval row keyed by the
 *      idempotency key for (runId, toolName, argsHash).
 *   2. If no decision exists yet the run is marked `paused_approval` and the
 *      handler exits — no process, no clock running (see budget.ts: the resumed
 *      attempt gets a fresh runtime window).
 *   3. When the operator decides, the Telegram HMAC callback enqueues an
 *      `approval-resume` trigger carrying the ORIGINAL run id. The supervisor
 *      re-enters the same run; the handler replays from the top and reaches this
 *      gate again, now with a recorded decision.
 *   4. Executing an approved action first check-and-sets `consumedAt` with a
 *      conditional update. Exactly one caller can win, so a resume replay — or
 *      an approval that lands after the run already timed out — can never
 *      double-send.
 *
 * See docs/agents/approval-architecture.md.
 */

/** Pending approvals older than this are expired by the sweep (default 24h). */
export const DEFAULT_APPROVAL_TTL_MS = Number(
  process.env.PAT_APPROVAL_TTL_MS ?? 24 * 60 * 60 * 1000
);

export interface ApprovalRequest {
  runId: string;
  agentKey: string;
  toolName: string;
  proposedAction: string;
  proposedArgs: ToolArgs;
  blastRadius?: string;
  rationale?: string;
  estCostUsd?: number;
}

export type ApprovalGate =
  /** Decision recorded and this caller won the check-and-set — execute now. */
  | { kind: "approved"; approvalId: string; editedArgs?: ToolArgs }
  /** Approved, but the side effect already fired once — do NOT execute again. */
  | { kind: "already_executed"; approvalId: string }
  /** No decision yet: the run must suspend and be resumed by the callback. */
  | { kind: "paused"; approvalId: string }
  /** Denied / expired / cancelled — the call must not proceed. */
  | { kind: "blocked"; approvalId: string | null; reason: string };

/**
 * Thrown by the approval gate to unwind the handler when a run must suspend.
 * The SDK catches it and closes the run as `paused_approval` — a pause, not a
 * failure, so nothing is written to errorClass/errorMessage.
 */
export class ApprovalPauseSignal extends Error {
  constructor(
    public readonly approvalId: string,
    public readonly toolName: string
  ) {
    super(`Run paused awaiting approval ${approvalId} for "${toolName}".`);
    this.name = "ApprovalPauseSignal";
  }
}

/**
 * Resolve the approval state for one gated call. Never blocks and never sleeps:
 * it returns the gate decision and the caller (hooks.preToolUse) acts on it.
 */
export async function ensureApproval(request: ApprovalRequest): Promise<ApprovalGate> {
  const idempotencyKey = idempotencyKeyFor(request.runId, request.toolName, request.proposedArgs);

  const existing = await prisma.agentApproval.findUnique({ where: { idempotencyKey } });

  if (!existing) {
    const approval = await prisma.agentApproval.create({
      data: {
        runId: request.runId,
        agentKey: request.agentKey,
        toolName: request.toolName,
        proposedAction: request.proposedAction,
        proposedArgs: toJsonValue(request.proposedArgs),
        rationale: request.rationale ?? null,
        blastRadius: request.blastRadius ?? "medium",
        estCostUsd: request.estCostUsd ?? null,
        status: "pending",
        idempotencyKey,
      },
    });

    try {
      await sendApprovalToTelegram(approval.id);
    } catch (error) {
      // The card failed to send (e.g. telegram env missing). The row still
      // stands and an operator can resolve it via /admin — record why the card
      // is absent so the silence is explainable.
      await auditLog({
        runId: request.runId,
        agentKey: request.agentKey,
        hookPhase: "approval_decision",
        payload: {
          approvalId: approval.id,
          cardSendError: error instanceof Error ? error.message : String(error),
        },
      });
    }

    return { kind: "paused", approvalId: approval.id };
  }

  if (existing.status === "pending") {
    // Still waiting. The card was already sent when the row was created; do not
    // re-send it on every replay.
    return { kind: "paused", approvalId: existing.id };
  }

  if (existing.status === "approved" || existing.status === "edited") {
    // Check-and-set: only the caller that flips consumedAt from NULL executes.
    const claimed = await prisma.agentApproval.updateMany({
      where: { id: existing.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (claimed.count !== 1) {
      await auditLog({
        runId: request.runId,
        agentKey: request.agentKey,
        hookPhase: "pre_tool_use",
        payload: {
          approvalId: existing.id,
          toolName: request.toolName,
          reason: "idempotency_key_already_consumed",
        },
        outcome: "blocked",
      });
      return { kind: "already_executed", approvalId: existing.id };
    }
    return {
      kind: "approved",
      approvalId: existing.id,
      editedArgs:
        existing.status === "edited" && existing.editedArgs
          ? (existing.editedArgs as unknown as ToolArgs)
          : undefined,
    };
  }

  // denied / expired / cancelled all halt the call.
  const reason =
    existing.status === "denied"
      ? "operator denied"
      : existing.status === "expired"
        ? "approval expired"
        : "approval cancelled";
  return { kind: "blocked", approvalId: existing.id, reason };
}

/**
 * Expire pending approvals older than the TTL. Conditional on status "pending"
 * so it can never overwrite a decision an operator recorded concurrently — the
 * approve/expire race that previously let a late expiry clobber an approval.
 */
export async function expireStaleApprovals(
  ttlMs = DEFAULT_APPROVAL_TTL_MS,
  now = new Date()
): Promise<number> {
  const cutoff = new Date(now.getTime() - ttlMs);
  const result = await prisma.agentApproval.updateMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
    data: { status: "expired", decidedAt: now, decisionNote: "approval timed out" },
  });
  return result.count;
}

/**
 * Expire the pending approvals belonging to a run that has reached a terminal
 * failure (timeout / budget). Also conditional on "pending": if the operator
 * approved a beat earlier, their decision stands and the idempotency guard —
 * not this update — is what keeps the effect from firing.
 */
export async function expirePendingApprovalsForRun(
  runId: string,
  note = "run ended before the approval was decided"
): Promise<number> {
  const result = await prisma.agentApproval.updateMany({
    where: { runId, status: "pending" },
    data: { status: "expired", decidedAt: new Date(), decisionNote: note },
  });
  return result.count;
}
