import type { AgentConfig } from "./config";
import type { HookCtx, TokenUsage } from "./types";

/**
 * Per-run budget enforcement. Hard caps come from a config's `limits` block and
 * are tracked in a process-local map keyed by runId (the supervisor is a single
 * process). `checkBudget` is called from the PreToolUse hook before every tool
 * call — it counts the turn and throws once any cap is crossed; the SDK maps the
 * throw to a terminal run status.
 */

export type BudgetReason = "max_turns" | "max_budget_usd" | "max_runtime_seconds";

export class BudgetExceededError extends Error {
  constructor(
    public readonly reason: BudgetReason,
    message: string
  ) {
    super(message);
    this.name = "BudgetExceededError";
  }
}

interface RunBudget {
  limits: AgentConfig["limits"];
  turns: number;
  costUsd: number;
  startedAt: number;
}

const budgets = new Map<string, RunBudget>();

export function startRun(runId: string, limits: AgentConfig["limits"]): void {
  budgets.set(runId, { limits, turns: 0, costUsd: 0, startedAt: Date.now() });
}

export function endRun(runId: string): void {
  budgets.delete(runId);
}

/** Counts one turn and throws if any hard cap is now exceeded. */
export async function checkBudget(ctx: HookCtx): Promise<void> {
  const budget = budgets.get(ctx.runId);
  if (!budget) {
    return;
  }
  budget.turns += 1;

  if (budget.turns > budget.limits.max_turns) {
    throw new BudgetExceededError(
      "max_turns",
      `Agent "${ctx.agentKey}" exceeded max_turns (${budget.limits.max_turns}).`
    );
  }

  const elapsedSeconds = (Date.now() - budget.startedAt) / 1000;
  if (elapsedSeconds > budget.limits.max_runtime_seconds) {
    throw new BudgetExceededError(
      "max_runtime_seconds",
      `Agent "${ctx.agentKey}" exceeded max_runtime_seconds (${budget.limits.max_runtime_seconds}).`
    );
  }

  if (budget.costUsd > budget.limits.max_budget_usd) {
    throw new BudgetExceededError(
      "max_budget_usd",
      `Agent "${ctx.agentKey}" exceeded max_budget_usd (${budget.limits.max_budget_usd}).`
    );
  }
}

/** Accrue cost from a tool/model result's usage (no-op when usage is absent). */
export async function recordCost(ctx: HookCtx, usage?: TokenUsage): Promise<void> {
  const budget = budgets.get(ctx.runId);
  if (!budget || !usage?.costUsd) {
    return;
  }
  budget.costUsd += usage.costUsd;
}

/** Snapshot for the SDK to persist on the AgentRun row when it finishes. */
export function budgetSnapshot(runId: string): { turns: number; costUsd: number } | null {
  const budget = budgets.get(runId);
  if (!budget) {
    return null;
  }
  return { turns: budget.turns, costUsd: budget.costUsd };
}
