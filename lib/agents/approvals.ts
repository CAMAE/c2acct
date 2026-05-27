import prisma from "@/lib/prisma";
import { toJsonValue } from "./json";
import { auditLog } from "./audit";
import { sendApprovalToTelegram } from "@/ops/telegram-bot/approvals";
import type { AgentApproval } from "@prisma/client";
import type { ToolArgs } from "./types";

const DEFAULT_TIMEOUT_MS = 24 * 60 * 60 * 1000; // 24h
const DEFAULT_POLL_INTERVAL_MS = 5_000;

export interface ApprovalRequest {
  runId: string;
  agentKey: string;
  proposedAction: string;
  proposedArgs: ToolArgs;
  blastRadius?: string;
  rationale?: string;
  estCostUsd?: number;
  /** How long to wait for a decision before timing out. Default 24h. */
  timeoutMs?: number;
  /** How often to poll the row for a decision. Default 5s. */
  pollIntervalMs?: number;
}

export interface ApprovalDecision {
  outcome: "approved" | "denied" | "edited" | "timeout";
  editedArgs?: ToolArgs;
  decidedBy?: string;
  decisionNote?: string;
}

/**
 * Request operator approval for a gated action and block until a decision is
 * recorded (by the Telegram bot, via the shared DB) or the timeout elapses.
 *
 * Flow: insert a pending AgentApproval, mark the run `awaiting_approval`, send the
 * Telegram card (HMAC-signed buttons), then poll the row. The bot process records
 * the human's decision + the canonical approval_decision audit; this function
 * detects it, restores the run to `running`, and returns the decision shape.
 *
 * Note: the wait counts against the agent's max_runtime_seconds. Long-lived
 * approvals (Pilot Ops, Phase 1b) raise that cap as a stopgap.
 *
 * TODO(approval-resume): replace this blocking wait with the async pause/resume
 * pattern (terminate the run as awaiting_approval; the decision handler enqueues
 * an "approval-resume" run). Decouples human latency from process runtime. See
 * docs/agents/approval-architecture.md. Target: 2nd approval-gated agent or any
 * multi-tenant deploy, whichever first.
 */
export async function requestApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
  const approval = await prisma.agentApproval.create({
    data: {
      runId: request.runId,
      agentKey: request.agentKey,
      proposedAction: request.proposedAction,
      proposedArgs: toJsonValue(request.proposedArgs),
      rationale: request.rationale ?? null,
      blastRadius: request.blastRadius ?? "medium",
      estCostUsd: request.estCostUsd ?? null,
      status: "pending",
    },
  });

  await prisma.agentRun.update({
    where: { id: request.runId },
    data: { status: "awaiting_approval" },
  });

  try {
    await sendApprovalToTelegram(approval.id);
  } catch (error) {
    // The card failed to send (e.g. telegram env missing). Still poll — an
    // operator can resolve the row via /admin — but record why the card is absent.
    await auditLog({
      runId: request.runId,
      agentKey: request.agentKey,
      hookPhase: "approval_decision",
      payload: { approvalId: approval.id, cardSendError: error instanceof Error ? error.message : String(error) },
    });
  }

  const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const pollIntervalMs = request.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await sleep(pollIntervalMs);
    const row = await prisma.agentApproval.findUnique({ where: { id: approval.id } });
    if (!row) {
      break;
    }
    if (row.status !== "pending") {
      await prisma.agentRun.update({ where: { id: request.runId }, data: { status: "running" } });
      return rowToDecision(row);
    }
  }

  // Timed out: expire the row and audit the timeout (outcome left null — the
  // hard rule's approved/denied/edited outcomes are written by the bot).
  await prisma.agentApproval
    .update({ where: { id: approval.id }, data: { status: "expired", decidedAt: new Date(), decisionNote: "approval timed out" } })
    .catch(() => undefined);
  await auditLog({
    runId: request.runId,
    agentKey: request.agentKey,
    hookPhase: "approval_decision",
    payload: { approvalId: approval.id, outcome: "timeout" },
  });
  return { outcome: "timeout" };
}

function rowToDecision(row: AgentApproval): ApprovalDecision {
  if (row.status === "approved") {
    return { outcome: "approved", decidedBy: row.decidedBy ?? undefined, decisionNote: row.decisionNote ?? undefined };
  }
  if (row.status === "edited") {
    return {
      outcome: "edited",
      editedArgs: row.editedArgs ? (row.editedArgs as unknown as ToolArgs) : undefined,
      decidedBy: row.decidedBy ?? undefined,
      decisionNote: row.decisionNote ?? undefined,
    };
  }
  // denied / expired / cancelled all halt the agent.
  return { outcome: "denied", decidedBy: row.decidedBy ?? undefined, decisionNote: row.decisionNote ?? undefined };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
