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
  tokensInput: number;
  tokensOutput: number;
  startedAt: number;
}

const budgets = new Map<string, RunBudget>();

/**
 * Begin (or re-begin) the budget window for a run attempt.
 *
 * Called once per ATTEMPT, including the attempt that resumes a run after an
 * approval pause. That is deliberate: `startedAt` resets, so the hours a run
 * spent parked in `paused_approval` waiting on a human do not count against
 * max_runtime_seconds (S1). The cap now measures the agent's own working time,
 * which is the thing it was meant to bound.
 */
export function startRun(runId: string, limits: AgentConfig["limits"]): void {
  budgets.set(runId, {
    limits,
    turns: 0,
    costUsd: 0,
    tokensInput: 0,
    tokensOutput: 0,
    startedAt: Date.now(),
  });
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

  // Active runtime for THIS attempt only — approval wait is excluded by design
  // (startRun resets the window when a paused run is resumed).
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

/**
 * Accrue real usage from a model/tool call. Tokens are accumulated even when the
 * caller reports no cost, so a run's AgentRun.tokensInput/tokensOutput reflect
 * what was actually spent rather than staying null (S3).
 */
export async function recordCost(ctx: HookCtx, usage?: TokenUsage): Promise<void> {
  const budget = budgets.get(ctx.runId);
  if (!budget || !usage) {
    return;
  }
  budget.tokensInput += usage.inputTokens ?? 0;
  budget.tokensOutput += usage.outputTokens ?? 0;
  budget.costUsd += usage.costUsd ?? 0;
}

export interface BudgetSnapshot {
  turns: number;
  costUsd: number;
  tokensInput: number;
  tokensOutput: number;
}

/** Snapshot for the SDK to persist on the AgentRun row when it finishes. */
export function budgetSnapshot(runId: string): BudgetSnapshot | null {
  const budget = budgets.get(runId);
  if (!budget) {
    return null;
  }
  return {
    turns: budget.turns,
    costUsd: budget.costUsd,
    tokensInput: budget.tokensInput,
    tokensOutput: budget.tokensOutput,
  };
}
