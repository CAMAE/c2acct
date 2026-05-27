import { auditLog } from "./audit";
import { checkBudget, recordCost } from "./budget";
import { requestApproval } from "./approvals";
import { isToolAllowed, resolveApprovalRule } from "./config";
import type { HookCtx, ToolArgs, TokenUsage } from "./types";

export interface PreToolUseResult {
  block: boolean;
  reason?: string;
  editedArgs?: ToolArgs;
}

/**
 * PreToolUse — runs before a tool executes: audit the intent, enforce budget,
 * and (when the config gates this tool) request operator approval. Approval
 * gating is enforced here in code, never via the system prompt (Blueprint §10
 * anti-pattern #3).
 */
export async function preToolUse(
  ctx: HookCtx,
  toolName: string,
  toolArgs: ToolArgs
): Promise<PreToolUseResult> {
  await auditLog({
    runId: ctx.runId,
    agentKey: ctx.agentKey,
    hookPhase: "pre_tool_use",
    payload: { toolName, toolArgs },
  });

  await checkBudget(ctx);

  const rule = resolveApprovalRule(ctx.config, toolName, toolArgs);
  if (rule.required) {
    // requestApproval blocks until the operator decides (recorded by the Telegram
    // bot via the shared DB) or it times out. The bot writes the canonical
    // approval_decision audit row, so we don't duplicate it here.
    const decision = await requestApproval({
      runId: ctx.runId,
      agentKey: ctx.agentKey,
      proposedAction: rule.ruleKey,
      proposedArgs: toolArgs,
      blastRadius: rule.blastRadius,
    });

    if (decision.outcome === "denied" || decision.outcome === "timeout") {
      return { block: true, reason: decision.outcome === "timeout" ? "approval timed out" : "operator denied" };
    }
    if (decision.outcome === "edited") {
      return { block: false, editedArgs: decision.editedArgs };
    }
    // approved → fall through and proceed
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
      payload: { toolName, toolArgs: toolArgs ?? null },
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
    payload: { toolName, toolArgs, result },
    outcome: "allowed",
  });
  await recordCost(ctx, usage);
}
