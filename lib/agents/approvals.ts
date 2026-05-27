import prisma from "@/lib/prisma";
import { toJsonValue } from "./json";
import type { ToolArgs } from "./types";

export interface ApprovalRequest {
  runId: string;
  agentKey: string;
  proposedAction: string;
  proposedArgs: ToolArgs;
  blastRadius?: string;
  rationale?: string;
}

export interface ApprovalDecision {
  outcome: "approved" | "denied" | "edited";
  editedArgs?: ToolArgs;
  reason?: string;
  decidedBy?: string;
}

/**
 * Request operator approval for a gated action.
 *
 * Phase 0 persists the pending AgentApproval (so it is visible in /admin and
 * survives a restart) and marks the run `awaiting_approval`, then **fails safe
 * by denying**. The Telegram round-trip (inline buttons + text replies, HMAC
 * signing) that actually resolves an approval lands in Phase 1d
 * (`ops/telegram-bot/approvals.ts`). No Phase 0 agent triggers an approval gate,
 * so this path is dormant until then.
 */
export async function requestApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
  await prisma.agentApproval.create({
    data: {
      runId: request.runId,
      agentKey: request.agentKey,
      proposedAction: request.proposedAction,
      proposedArgs: toJsonValue(request.proposedArgs),
      rationale: request.rationale ?? null,
      blastRadius: request.blastRadius ?? "medium",
      status: "pending",
    },
  });

  await prisma.agentRun.update({
    where: { id: request.runId },
    data: { status: "awaiting_approval" },
  });

  return {
    outcome: "denied",
    reason: "Approval round-trip not yet wired (Phase 1d); failing safe by denying.",
  };
}
