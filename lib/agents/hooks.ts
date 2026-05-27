import { auditLog } from "./audit";
import { checkBudget, recordCost } from "./budget";
import { requestApproval } from "./approvals";
import { isToolAllowed } from "./config";
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

  const rules = ctx.config.approval_rules;
  if (rules?.always_require_approval?.includes(toolName)) {
    const decision = await requestApproval({
      runId: ctx.runId,
      agentKey: ctx.agentKey,
      proposedAction: toolName,
      proposedArgs: toolArgs,
      blastRadius: rules.approval_blast_radius?.[toolName] ?? "medium",
    });

    await auditLog({
      runId: ctx.runId,
      agentKey: ctx.agentKey,
      hookPhase: "approval_decision",
      payload: { toolName, toolArgs, decision },
      outcome: decision.outcome,
    });

    if (decision.outcome === "denied") {
      return { block: true, reason: decision.reason ?? "operator denied" };
    }
    if (decision.outcome === "edited") {
      return { block: false, editedArgs: decision.editedArgs };
    }
  }

  return { block: false };
}

/** canUseTool — allowlist gate. Tools not declared in the config are blocked. */
export async function canUseTool(ctx: HookCtx, toolName: string): Promise<boolean> {
  if (!isToolAllowed(ctx.config, toolName)) {
    await auditLog({
      runId: ctx.runId,
      agentKey: ctx.agentKey,
      hookPhase: "can_use_tool",
      payload: { toolName },
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
