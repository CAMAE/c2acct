import { auditLog } from "./audit";
import { checkBudget, recordCost } from "./budget";
import { ApprovalPauseSignal, ensureApproval } from "./approvals";
import { isToolAllowed, resolveApprovalRule } from "./config";
import { redactToolArgs, redactToolResult } from "./redact";
import type { HookCtx, ToolArgs, TokenUsage } from "./types";

export interface PreToolUseResult {
  block: boolean;
  reason?: string;
  editedArgs?: ToolArgs;
  /**
   * The approved side effect already fired on an earlier attempt of this run
   * (idempotency key consumed). The tool must NOT execute again; the SDK
   * replays the recorded result instead.
   */
  skip?: boolean;
}

/**
 * PreToolUse — runs before a tool executes: audit the intent, enforce budget,
 * and (when the config gates this tool) resolve the operator approval. Approval
 * gating is enforced here in code, never via the system prompt (Blueprint §10
 * anti-pattern #3).
 *
 * The approval gate does not block (S1). When no decision has been recorded yet
 * it throws ApprovalPauseSignal, which unwinds the handler and closes the run as
 * `paused_approval`; the Telegram callback later enqueues an approval-resume
 * trigger that re-enters the same run id.
 */
export async function preToolUse(
  ctx: HookCtx,
  toolName: string,
  toolArgs: ToolArgs
): Promise<PreToolUseResult> {
  // Redact BEFORE persistence (S6). The audit trail is append-only, so a secret
  // written here can never be removed — and it is the substrate /admin reads.
  await auditLog({
    runId: ctx.runId,
    agentKey: ctx.agentKey,
    hookPhase: "pre_tool_use",
    payload: { toolName, toolArgs: redactToolArgs(toolArgs) },
  });

  await checkBudget(ctx);

  const rule = resolveApprovalRule(ctx.config, toolName, toolArgs);
  if (rule.required) {
    const gate = await ensureApproval({
      runId: ctx.runId,
      agentKey: ctx.agentKey,
      toolName,
      proposedAction: rule.ruleKey,
      proposedArgs: toolArgs,
      blastRadius: rule.blastRadius,
    });

    if (gate.kind === "paused") {
      // Unwind the handler; the SDK closes the run as paused_approval.
      throw new ApprovalPauseSignal(gate.approvalId, toolName);
    }
    if (gate.kind === "blocked") {
      return { block: true, reason: gate.reason };
    }
    if (gate.kind === "already_executed") {
      return { block: false, skip: true };
    }
    if (gate.editedArgs) {
      return { block: false, editedArgs: gate.editedArgs };
    }
    // approved and this caller won the check-and-set → proceed
  }

  return { block: false };
}

/**
 * canUseTool — allowlist gate. Tools not declared in the config are blocked.
 * `toolArgs` enable argument-aware matching (HTTP verb/URL globs, neon table
 * scope); see isToolAllowed.
 */
export async function canUseTool(ctx: HookCtx, toolName: string, toolArgs?: ToolArgs): Promise<boolean> {
  if (!isToolAllowed(ctx.config, toolName, toolArgs)) {
    await auditLog({
      runId: ctx.runId,
      agentKey: ctx.agentKey,
      hookPhase: "can_use_tool",
      payload: { toolName, toolArgs: toolArgs ? redactToolArgs(toolArgs) : null },
      outcome: "blocked",
    });
    return false;
  }
  return true;
}

/** PostToolUse — audit the result and accrue any reported cost. */
export async function postToolUse(
  ctx: HookCtx,
  toolName: string,
  toolArgs: ToolArgs,
  result: unknown,
  usage?: TokenUsage
): Promise<void> {
  await auditLog({
    runId: ctx.runId,
    agentKey: ctx.agentKey,
    hookPhase: "post_tool_use",
    payload: { toolName, toolArgs: redactToolArgs(toolArgs), result: redactToolResult(result) },
    outcome: "allowed",
  });
  await recordCost(ctx, usage);
}
