import prisma from "@/lib/prisma";
import { toJsonValue } from "@/lib/agents/json";
import { auditLog } from "@/lib/agents/audit";
import { enqueueTrigger } from "@/lib/agents/triggerQueue";
import {
  answerCallbackQuery,
  editMessageText,
  sendApprovalCard,
  sendMessage,
} from "@/lib/agents/telegram";
import type { AgentApproval } from "@prisma/client";
import type { ToolArgs } from "@/lib/agents/types";
import { signApproval, verifyApproval } from "./hmac";

export const APPROVAL_HEADER = "AGENT APPROVAL NEEDED";

// Minimal shapes of the Telegram updates we consume.
export interface TelegramFrom {
  id?: number;
  username?: string;
}
export interface TelegramCallbackQuery {
  id: string;
  data?: string;
  from?: TelegramFrom;
  message?: { message_id?: number; chat?: { id?: number | string } };
}
export interface TelegramMessage {
  text?: string;
  chat?: { id?: number | string };
  from?: TelegramFrom;
  reply_to_message?: { text?: string };
}

export type ParsedDecision = { decision: "approve" | "deny" | "edit"; editedArgs?: ToolArgs };

/**
 * Send the approval card to the operator (called from the agent process by
 * lib/agents/approvals.ts). Signs the callback_data with HMAC and stores the
 * message id + signature on the row.
 */
export async function sendApprovalToTelegram(approvalId: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("telegram env not configured (TELEGRAM_BOT_TOKEN / TELEGRAM_ALLOWED_CHAT_ID)");
  }

  const approval = await prisma.agentApproval.findUniqueOrThrow({ where: { id: approvalId } });
  const hmac = signApproval(approval.id, approval.createdAt.getTime());
  const messageId = await sendApprovalCard(token, {
    chat_id: chatId,
    text: renderApprovalText(approval),
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve:${approval.id}:${hmac}` },
        { text: "❌ Deny", callback_data: `deny:${approval.id}:${hmac}` },
      ],
      [{ text: "✏️ Edit (use text reply)", callback_data: `edit:${approval.id}:${hmac}` }],
    ],
  });

  await prisma.agentApproval.update({
    where: { id: approval.id },
    data: { telegramMsgId: messageId === null ? null : String(messageId), telegramHmac: hmac },
  });
}

/** Inline-button taps. HMAC is verified BEFORE any decision is recorded. */
export async function onCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const [action, approvalId, hmac] = (query.data ?? "").split(":");
  const approval = approvalId
    ? await prisma.agentApproval.findUnique({ where: { id: approvalId } })
    : null;

  const valid = approval ? verifyApproval(approval.id, approval.createdAt.getTime(), hmac ?? "") : false;
  if (!approval || !valid) {
    await auditLog({
      runId: approval?.runId ?? null,
      agentKey: approval?.agentKey ?? null,
      hookPhase: "approval_decision",
      payload: { reason: "hmac_invalid_or_missing", action: action ?? null, approvalId: approvalId ?? null, providedHmac: hmac ?? null },
      outcome: "blocked",
    });
    await answerCallbackQuery(token, query.id, "⚠️ Invalid or expired approval");
    return;
  }

  if (approval.status !== "pending") {
    await answerCallbackQuery(token, query.id, `Already ${approval.status}`);
    return;
  }

  if (action === "approve" || action === "deny") {
    await recordApprovalDecision(approval.id, { decision: action, decidedBy: actorOf(query.from) });
    await editApprovalMessage(token, approval, action === "approve" ? "✅ Approved — agent continuing." : "❌ Denied — agent halted.");
    await answerCallbackQuery(token, query.id, action === "approve" ? "Approved" : "Denied");
  } else if (action === "edit") {
    await answerCallbackQuery(
      token,
      query.id,
      "Reply to this card with your edit, e.g. 'approve but change subject to: Updated brief'"
    );
  } else {
    await answerCallbackQuery(token, query.id, "Unknown action");
  }
}

/**
 * Text replies to an approval card. Returns true if the message was an approval
 * reply (so the poller doesn't also treat it as a command). Parses approve /
 * deny / "approve but change X to: Y".
 */
export async function onApprovalReply(message: TelegramMessage): Promise<boolean> {
  const repliedText = message.reply_to_message?.text ?? "";
  if (!repliedText.startsWith(APPROVAL_HEADER)) {
    return false;
  }
  const approvalId = extractApprovalId(repliedText);
  const chatId = String(message.chat?.id ?? "");
  if (!approvalId) {
    await sendMessage(process.env.TELEGRAM_BOT_TOKEN ?? "", chatId, "Could not find the approval reference in that card.");
    return true;
  }

  const approval = await prisma.agentApproval.findUnique({ where: { id: approvalId } });
  if (!approval || approval.status !== "pending") {
    await sendMessage(
      process.env.TELEGRAM_BOT_TOKEN ?? "",
      chatId,
      approval ? `That approval is already ${approval.status}.` : "Approval not found."
    );
    return true;
  }

  const parsed = parseApprovalDecision(message.text ?? "");
  await recordApprovalDecision(approval.id, {
    decision: parsed.decision,
    decidedBy: actorOf(message.from),
    editedArgs: parsed.editedArgs,
    decisionNote: message.text ?? undefined,
  });
  await sendMessage(process.env.TELEGRAM_BOT_TOKEN ?? "", chatId, formatDecisionConfirmation(parsed));
  return true;
}

/**
 * Record a decision: update the AgentApproval row, write the canonical
 * approval_decision audit row (outcome approved|denied|edited), and settle the
 * paused run. This is the only place a human decision is persisted.
 *
 * Settling is what makes async pause/resume work (S1). The agent process that
 * proposed the action is long gone — nothing is polling this row — so the
 * decision handler owns waking the run back up:
 *   - approve / edit → enqueue an `approval-resume` trigger carrying the
 *     ORIGINAL run id. The supervisor re-enters that run; the handler replays
 *     and reaches the gate again, which now finds a decision. The idempotency
 *     key makes the replay safe.
 *   - deny → close the paused run in place. Re-entering only to fail at the
 *     gate would replay the handler's earlier steps for nothing.
 * Both writes are conditional on the run still being `paused_approval`, so a run
 * that already timed out is never revived by a late tap.
 */
export async function recordApprovalDecision(
  approvalId: string,
  input: { decision: "approve" | "deny" | "edit"; decidedBy?: string; editedArgs?: ToolArgs; decisionNote?: string }
): Promise<void> {
  const status = input.decision === "approve" ? "approved" : input.decision === "deny" ? "denied" : "edited";

  // Conditional on "pending" — the other half of the approve/expire race. The
  // callers check status first, but between their read and this write the
  // expiry sweep may have claimed the row. Whoever wins, wins; the loser must
  // not overwrite a recorded outcome.
  const applied = await prisma.agentApproval.updateMany({
    where: { id: approvalId, status: "pending" },
    data: {
      status,
      decision: input.decision,
      decidedBy: input.decidedBy ?? null,
      decidedAt: new Date(),
      editedArgs: input.editedArgs ? toJsonValue(input.editedArgs) : undefined,
      decisionNote: input.decisionNote ?? null,
    },
  });

  const approval = await prisma.agentApproval.findUniqueOrThrow({ where: { id: approvalId } });

  if (applied.count !== 1) {
    await auditLog({
      runId: approval.runId,
      agentKey: approval.agentKey,
      hookPhase: "approval_decision",
      payload: {
        approvalId,
        reason: "decision_lost_race",
        attempted: input.decision,
        settledStatus: approval.status,
      },
      outcome: "blocked",
    });
    return;
  }

  await auditLog({
    runId: approval.runId,
    agentKey: approval.agentKey,
    hookPhase: "approval_decision",
    payload: {
      approvalId,
      decision: input.decision,
      editedArgs: input.editedArgs ?? null,
      decidedBy: input.decidedBy ?? null,
    },
    outcome: status,
  });

  await settlePausedRun(approval.runId, approval.agentKey, input.decision);
}

/**
 * Wake or close the run this approval paused. Conditional on `paused_approval`:
 * if the run already reached a terminal status (it timed out while the card sat
 * unanswered), a late decision settles nothing and no side effect can follow.
 */
async function settlePausedRun(
  runId: string,
  agentKey: string,
  decision: "approve" | "deny" | "edit"
): Promise<void> {
  if (decision === "deny") {
    const closed = await prisma.agentRun.updateMany({
      where: { id: runId, status: "paused_approval" },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorClass: "approval_denied",
        errorMessage: "operator denied the gated action",
      },
    });
    if (closed.count === 1) {
      console.log(`[approvals] run ${runId} (${agentKey}) closed: operator denied.`);
    }
    return;
  }

  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { status: true },
  });
  if (run?.status !== "paused_approval") {
    // Nothing to resume: the run already ended (timeout / cancel) or is live.
    await auditLog({
      runId,
      agentKey,
      hookPhase: "approval_decision",
      payload: { reason: "resume_skipped_run_not_paused", runStatus: run?.status ?? null },
      outcome: "blocked",
    });
    return;
  }

  const trigger = await enqueueTrigger({
    agentKey,
    resumeRunId: runId,
    requestedBy: "approval-resume",
    message: `resume run ${runId} after approval`,
  });
  console.log(`[approvals] run ${runId} (${agentKey}) resume queued as trigger ${trigger.id}.`);
}

/** Parse a free-text approval reply. Haiku seam for ambiguous text; deterministic now. */
export function parseApprovalDecision(text: string): ParsedDecision {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const editMatch = trimmed.match(/change\s+([A-Za-z0-9_]+)\s+to:\s*(.+)$/i);

  if (editMatch) {
    return { decision: "edit", editedArgs: { [editMatch[1]]: editMatch[2].trim() } };
  }
  if (/\b(deny|denied|reject|rejected|no|nope)\b/.test(lower)) {
    return { decision: "deny" };
  }
  if (/\b(approve|approved|yes|ok|okay|lgtm|go|ship)\b/.test(lower)) {
    return { decision: "approve" };
  }
  // Ambiguous: without a Haiku classifier configured, fail safe by denying.
  return { decision: "deny" };
}

export function renderApprovalText(approval: AgentApproval): string {
  const args = JSON.stringify(approval.proposedArgs, null, 2);
  return [
    `${APPROVAL_HEADER} — ${approval.agentKey}`,
    "",
    `Proposed action: ${approval.proposedAction}`,
    `Blast radius: ${approval.blastRadius ?? "?"}`,
    `Est cost: $${approval.estCostUsd ?? "?"}`,
    "",
    "Args:",
    "```json",
    args,
    "```",
    approval.rationale ? `Rationale: ${approval.rationale}` : "",
    `Ref: ${approval.id}`,
    "",
    'Tap a button or reply with text ("approve", "deny", "approve but change X to: Y").',
  ]
    .filter((line) => line !== "")
    .join("\n");
}

function extractApprovalId(cardText: string): string | null {
  const match = cardText.match(/Ref:\s*([a-z0-9]+)/i);
  return match ? match[1] : null;
}

function formatDecisionConfirmation(parsed: ParsedDecision): string {
  if (parsed.decision === "approve") {
    return "✅ Approved — agent continuing.";
  }
  if (parsed.decision === "deny") {
    return "❌ Denied — agent halted.";
  }
  return `✏️ Edited & approved — applying ${JSON.stringify(parsed.editedArgs)}.`;
}

async function editApprovalMessage(token: string, approval: AgentApproval, text: string): Promise<void> {
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID ?? "";
  const messageId = approval.telegramMsgId ? Number(approval.telegramMsgId) : null;
  if (!chatId || messageId === null || Number.isNaN(messageId)) {
    return;
  }
  await editMessageText(token, { chat_id: chatId, message_id: messageId, text });
}

function actorOf(from?: TelegramFrom): string {
  if (from?.username) {
    return `telegram:${from.username}`;
  }
  if (from?.id !== undefined) {
    return `telegram:${from.id}`;
  }
  return "telegram:unknown";
}
